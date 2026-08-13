#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_PATH = path.join(ROOT, 'data.json');
const BACKUP_PATH = path.join(ROOT, 'data.backup-20260813-2.json');
const SOURCE_ROOT = '/Users/alphabravo/Downloads/autorazmetka-new/4yavUTCeCp0';
const SOURCE_ELEMENTS_PATH = path.join(SOURCE_ROOT, 'elements-4yavUTCeCp0-v2.json');
const SOURCE_PROJECT_PATH = path.join(SOURCE_ROOT, 'project-4yavUTCeCp0.json');
const CANONICAL_Q_PROJECT_ID = '199a5705-1235-480d-8f3b-c76f02d40c58';
const DAMAGED_Q_PROJECT_ID = 'c7b3604b-d801-49ca-b17e-4ba549e1e1d9';
const Q_VIDEO_ID = 'QOUszAHEZAE';
const IMPORT_VIDEO_ID = '4yavUTCeCp0';
const EXPECTED_IMPORT_ELEMENTS = 624;

function youtubeVideoId(value) {
  try {
    const url = new URL(String(value || ''));
    if (url.hostname === 'youtu.be') return url.pathname.split('/').filter(Boolean)[0] || '';
    return url.searchParams.get('v') || '';
  } catch (error) {
    return '';
  }
}

function validateImport(project, elements) {
  if (!project || typeof project !== 'object' || Array.isArray(project)) throw new Error('Invalid source project');
  if (!Array.isArray(elements) || elements.length !== EXPECTED_IMPORT_ELEMENTS) {
    throw new Error(`Expected ${EXPECTED_IMPORT_ELEMENTS} source elements, got ${elements.length}`);
  }
  if (youtubeVideoId(project.url) !== IMPORT_VIDEO_ID) throw new Error('Unexpected source video');
  const ids = new Set();
  for (const element of elements) {
    if (!element?.id || ids.has(String(element.id))) throw new Error(`Invalid or duplicate source element ID: ${element?.id}`);
    if (String(element.projectId) !== String(project.id)) throw new Error(`Source projectId mismatch: ${element.id}`);
    ids.add(String(element.id));
  }
}

function writeJsonAtomic(filePath, value) {
  const temporaryPath = `${filePath}.tmp`;
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  fs.writeFileSync(temporaryPath, serialized);
  JSON.parse(fs.readFileSync(temporaryPath, 'utf8'));
  fs.renameSync(temporaryPath, filePath);
}

function main() {
  if (!fs.existsSync(BACKUP_PATH)) throw new Error(`Required backup is missing: ${BACKUP_PATH}`);
  const catalog = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const sourceProject = JSON.parse(fs.readFileSync(SOURCE_PROJECT_PATH, 'utf8'));
  const sourceElements = JSON.parse(fs.readFileSync(SOURCE_ELEMENTS_PATH, 'utf8'));
  if (!Array.isArray(catalog.projects) || !Array.isArray(catalog.elements)) throw new Error('Invalid data.json schema');
  validateImport(sourceProject, sourceElements);

  const canonical = catalog.projects.find((project) => String(project.id) === CANONICAL_Q_PROJECT_ID);
  if (!canonical || youtubeVideoId(canonical.url) !== Q_VIDEO_ID) throw new Error('Canonical QOUszAHEZAE project is missing');
  const damaged = catalog.projects.find((project) => String(project.id) === DAMAGED_Q_PROJECT_ID);
  if (damaged && youtubeVideoId(damaged.url) !== Q_VIDEO_ID) throw new Error('Damaged project ID points to another video');

  let reparented = 0;
  for (const element of catalog.elements) {
    if (String(element.projectId) !== DAMAGED_Q_PROJECT_ID) continue;
    element.projectId = CANONICAL_Q_PROJECT_ID;
    reparented += 1;
  }
  catalog.projects = catalog.projects.filter((project) => String(project.id) !== DAMAGED_Q_PROJECT_ID);
  canonical.url = `https://www.youtube.com/watch?v=${Q_VIDEO_ID}`;
  canonical.duration = '15:02';

  const existingProject = catalog.projects.find((project) => String(project.id) === String(sourceProject.id));
  if (existingProject && youtubeVideoId(existingProject.url) !== IMPORT_VIDEO_ID) {
    throw new Error(`Project ID collision: ${sourceProject.id}`);
  }
  let projectAdded = false;
  if (!existingProject) {
    catalog.projects.push({ ...sourceProject });
    projectAdded = true;
  }

  const elementsById = new Map(catalog.elements.map((element) => [String(element.id), element]));
  let elementsAdded = 0;
  for (const sourceElement of sourceElements) {
    const existing = elementsById.get(String(sourceElement.id));
    if (existing) {
      if (String(existing.projectId) !== String(sourceProject.id)) throw new Error(`Element ID collision: ${sourceElement.id}`);
      continue;
    }
    const element = { ...sourceElement };
    catalog.elements.push(element);
    elementsById.set(String(element.id), element);
    elementsAdded += 1;
  }

  const qProjects = catalog.projects.filter((project) => youtubeVideoId(project.url) === Q_VIDEO_ID);
  const importedElements = catalog.elements.filter((element) => String(element.projectId) === String(sourceProject.id));
  const canonicalElements = catalog.elements.filter((element) => String(element.projectId) === CANONICAL_Q_PROJECT_ID);
  if (qProjects.length !== 1) throw new Error(`QOUszAHEZAE still has ${qProjects.length} project records`);
  if (importedElements.length !== EXPECTED_IMPORT_ELEMENTS) throw new Error(`Imported project has ${importedElements.length} elements`);
  if (catalog.elements.some((element) => String(element.projectId) === DAMAGED_Q_PROJECT_ID)) throw new Error('Damaged project still owns elements');

  writeJsonAtomic(DATA_PATH, catalog);
  process.stdout.write(`${JSON.stringify({
    projects: catalog.projects.length,
    elements: catalog.elements.length,
    projectAdded,
    elementsAdded,
    qProjectRemoved: Boolean(damaged),
    qElementsReparented: reparented,
    qCanonicalElements: canonicalElements.length,
    importedElements: importedElements.length
  }, null, 2)}\n`);
}

main();
