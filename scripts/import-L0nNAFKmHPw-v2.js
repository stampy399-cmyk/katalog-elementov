#!/usr/bin/env node

'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_PATH = path.join(ROOT, 'data.json');
const BACKUP_PATH = path.join(ROOT, 'data.backup-20260813-3.json');
const ASSET_ROOT = path.join(ROOT, 'assets', 'elements');
const SOURCE_ROOT = '/Users/alphabravo/Downloads/autorazmetka-new/L0nNAFKmHPw';
const SOURCE_ELEMENTS_PATH = path.join(SOURCE_ROOT, 'elements-L0nNAFKmHPw-v2.json');
const SOURCE_PROJECT_PATH = path.join(SOURCE_ROOT, 'project-L0nNAFKmHPw.json');
const SOURCE_IMAGES_ROOT = path.join(SOURCE_ROOT, 'card-screens-v2');
const VIDEO_ID = 'L0nNAFKmHPw';
const EXPECTED_SOURCE_ELEMENTS = 340;
const BASE_VIDEO_THRESHOLD = 0.5;
const MIN_IMAGE_BYTES = 5 * 1024;
const FAMILY_ORDER = Object.freeze([
  'KEYFRAMES-MOTION', 'PHOTO-IMAGE', 'HARD-CUT', 'OPACITY-FADE', 'INSET-WINDOW', 'SCALE-ZOOM',
  'TEXT-TYPOGRAPHY', 'POSITION-SLIDE', 'GRID-LINES', 'LIGHT-GLOW', 'SATURATION-COLOR', 'OTHER',
  'CROSSFADE', 'BLEND-MODE', 'GEOMETRY-SHAPE', 'EMPTY', 'CAMERA-MOTION', 'BLUR-EFFECT'
]);

function youtubeVideoId(value) {
  try {
    const url = new URL(String(value || ''));
    if (url.hostname === 'youtu.be') return url.pathname.split('/').filter(Boolean)[0] || '';
    return url.searchParams.get('v') || '';
  } catch (error) {
    return '';
  }
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function sourceImagePath(element) {
  const candidate = path.resolve(SOURCE_ROOT, String(element.image || ''));
  if (path.dirname(candidate) !== SOURCE_IMAGES_ROOT || path.basename(candidate) !== `${element.id}.jpg`) {
    throw new Error(`Unexpected source image path for ${element.id}: ${element.image}`);
  }
  return candidate;
}

function validateSource(project, elements) {
  if (!project || typeof project !== 'object' || Array.isArray(project)) throw new Error('Invalid source project');
  if (youtubeVideoId(project.url) !== VIDEO_ID) throw new Error('Unexpected source project video');
  if (!Array.isArray(elements) || elements.length !== EXPECTED_SOURCE_ELEMENTS) {
    throw new Error(`Expected ${EXPECTED_SOURCE_ELEMENTS} source elements, got ${elements.length}`);
  }
  const ids = new Set();
  for (const element of elements) {
    const id = String(element?.id || '');
    if (!id || ids.has(id)) throw new Error(`Invalid or duplicate source element ID: ${id}`);
    if (String(element.projectId) !== String(project.id)) throw new Error(`Source projectId mismatch: ${id}`);
    if (!FAMILY_ORDER.includes(element.family)) throw new Error(`Invalid family for ${id}: ${element.family}`);
    if (!Array.isArray(element.timecodes) || !String(element.timecodes[0] || '').trim()) throw new Error(`Missing timecode: ${id}`);
    const imagePath = sourceImagePath(element);
    if (!fs.existsSync(imagePath)) throw new Error(`Missing source image: ${imagePath}`);
    if (fs.statSync(imagePath).size <= MIN_IMAGE_BYTES) throw new Error(`Source image is <=5 KiB: ${imagePath}`);
    ids.add(id);
  }
}

function copyImage(element) {
  const sourcePath = sourceImagePath(element);
  const destinationPath = path.join(ASSET_ROOT, `${element.id}.jpg`);
  if (fs.existsSync(destinationPath)) {
    if (sha256(sourcePath) !== sha256(destinationPath)) throw new Error(`Image collision: ${destinationPath}`);
    return { path: destinationPath, reused: true };
  }
  const temporaryPath = `${destinationPath}.tmp-${process.pid}`;
  fs.copyFileSync(sourcePath, temporaryPath);
  if (sha256(sourcePath) !== sha256(temporaryPath)) throw new Error(`Image copy verification failed: ${element.id}`);
  fs.renameSync(temporaryPath, destinationPath);
  return { path: destinationPath, reused: false };
}

function recalculate(elements, projectCount) {
  const stats = new Map(FAMILY_ORDER.map((family) => [family, { total: 0, projects: new Set() }]));
  for (const element of elements) {
    if (!FAMILY_ORDER.includes(element.family)) throw new Error(`Invalid catalog family: ${element.id} ${element.family}`);
    const family = stats.get(element.family);
    family.total += 1;
    family.projects.add(String(element.projectId));
  }
  for (const element of elements) {
    const family = stats.get(element.family);
    element.freq_videos = family.projects.size;
    element.freq_total = family.total;
    element.tier = projectCount > 0 && family.projects.size / projectCount >= BASE_VIDEO_THRESHOLD ? 'base' : 'unique';
  }
  return stats;
}

function writeJsonAtomic(filePath, value) {
  const temporaryPath = `${filePath}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`);
  JSON.parse(fs.readFileSync(temporaryPath, 'utf8'));
  fs.renameSync(temporaryPath, filePath);
}

function main() {
  if (!fs.existsSync(BACKUP_PATH)) throw new Error(`Required backup is missing: ${BACKUP_PATH}`);
  const catalog = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const sourceProject = JSON.parse(fs.readFileSync(SOURCE_PROJECT_PATH, 'utf8'));
  const sourceElements = JSON.parse(fs.readFileSync(SOURCE_ELEMENTS_PATH, 'utf8'));
  if (!Array.isArray(catalog.projects) || !Array.isArray(catalog.elements)) throw new Error('Invalid data.json schema');
  validateSource(sourceProject, sourceElements);

  const matchingProjects = catalog.projects.filter((project) => youtubeVideoId(project.url) === VIDEO_ID);
  if (matchingProjects.length > 1) throw new Error(`Duplicate ${VIDEO_ID} project records: ${matchingProjects.length}`);
  let project = matchingProjects[0];
  let projectAdded = false;
  if (!project) {
    const idCollision = catalog.projects.find((candidate) => String(candidate.id) === String(sourceProject.id));
    if (idCollision) throw new Error(`Project ID collision: ${sourceProject.id}`);
    project = { ...sourceProject };
    catalog.projects.push(project);
    projectAdded = true;
  }

  const elementsById = new Map(catalog.elements.map((element) => [String(element.id), element]));
  const sourceIds = new Set(sourceElements.map((element) => String(element.id)));
  let added = 0;
  const prepared = [];
  for (const sourceElement of sourceElements) {
    const existing = elementsById.get(String(sourceElement.id));
    if (existing) {
      if (String(existing.projectId) !== String(project.id)) throw new Error(`Element ID collision: ${sourceElement.id}`);
      prepared.push(existing);
      continue;
    }
    const element = {
      ...sourceElement,
      projectId: project.id,
      image: `assets/elements/${sourceElement.id}.jpg`
    };
    catalog.elements.push(element);
    elementsById.set(String(element.id), element);
    prepared.push(element);
    added += 1;
  }

  let imagesCreated = 0;
  let imagesReused = 0;
  for (const sourceElement of sourceElements) {
    const result = copyImage(sourceElement);
    if (result.reused) imagesReused += 1;
    else imagesCreated += 1;
    elementsById.get(String(sourceElement.id)).image = `assets/elements/${sourceElement.id}.jpg`;
  }

  const stats = recalculate(catalog.elements, catalog.projects.length);
  const projectIds = new Set(catalog.projects.map((candidate) => String(candidate.id)));
  const allElementIds = catalog.elements.map((element) => String(element.id));
  const duplicateElementIds = allElementIds.length - new Set(allElementIds).size;
  const emptyImages = catalog.elements.filter((element) => !String(element.image || '').trim()).length;
  const imported = catalog.elements.filter((element) => sourceIds.has(String(element.id)));
  const videoProjects = catalog.projects.filter((candidate) => youtubeVideoId(candidate.url) === VIDEO_ID);
  const invalidProjectLinks = catalog.elements.filter((element) => !projectIds.has(String(element.projectId))).length;
  const singleVideoTierErrors = catalog.elements.filter((element) => element.freq_videos === 1 && element.tier !== 'unique').length;
  if (duplicateElementIds) throw new Error(`Duplicate element IDs after import: ${duplicateElementIds}`);
  if (emptyImages) throw new Error(`Empty images after import: ${emptyImages}`);
  if (imported.length !== EXPECTED_SOURCE_ELEMENTS) throw new Error(`Imported source IDs: ${imported.length}`);
  if (videoProjects.length !== 1) throw new Error(`${VIDEO_ID} project records after import: ${videoProjects.length}`);
  if (invalidProjectLinks) throw new Error(`Invalid project links: ${invalidProjectLinks}`);
  if (singleVideoTierErrors) throw new Error(`freq_videos=1 tier errors: ${singleVideoTierErrors}`);

  writeJsonAtomic(DATA_PATH, catalog);
  const base = catalog.elements.filter((element) => element.tier === 'base').length;
  const unique = catalog.elements.length - base;
  process.stdout.write(`${JSON.stringify({
    projects: catalog.projects.length,
    elements: catalog.elements.length,
    base,
    unique,
    families: stats.size,
    projectAdded,
    elementsAdded: added,
    importedSourceIds: imported.length,
    imagesCreated,
    imagesReused,
    emptyImages,
    duplicateElementIds,
    singleVideoTierErrors
  }, null, 2)}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
}
