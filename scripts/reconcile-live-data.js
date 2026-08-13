#!/usr/bin/env node

'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { BASE_VIDEO_THRESHOLD, FAMILY_ORDER, classifyFamily } = require('./enrich-families');

const root = path.resolve(__dirname, '..');
const livePath = path.resolve(process.argv[2] || path.join(root, 'data.backup-20260813.json'));
const snapshotPath = path.join(root, 'data.backup-20260813.json');
const dataPath = path.join(root, 'data.json');
const rollbackPath = path.resolve(process.argv[3] || '/tmp/katalog-elementov-integraciya/pre-merge-data.json');
const ENRICHMENT_FIELDS = Object.freeze(['family', 'freq_videos', 'freq_total', 'tier']);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function hash(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function youtubeId(url) {
  const match = String(url || '').match(/(?:v=|youtu\.be\/)([^&?/]+)/);
  return match ? match[1] : '';
}

function canonicalProjectId(liveProjectId, liveProjects, currentProjects) {
  const source = liveProjects.find((project) => String(project.id) === String(liveProjectId));
  const videoId = youtubeId(source?.url);
  const canonical = currentProjects.find((project) => youtubeId(project.url) === videoId);
  return canonical?.id || liveProjectId;
}

function main() {
  if (hash(livePath) !== hash(snapshotPath)) {
    throw new Error('Live data differs from data.backup-20260813.json; manual conflict review is required.');
  }

  fs.mkdirSync(path.dirname(rollbackPath), { recursive: true });
  fs.copyFileSync(dataPath, rollbackPath);

  const live = readJson(livePath);
  const current = readJson(dataPath);
  const liveById = new Map(live.elements.map((element) => [String(element.id), element]));
  const currentById = new Map(current.elements.map((element) => [String(element.id), element]));
  const liveProjectsById = new Map(live.projects.map((project) => [String(project.id), project]));
  const restored = [];
  const ownerTextConflicts = [];

  const elements = current.elements.map((local) => {
    const owner = liveById.get(String(local.id));
    if (!owner) return { ...local };

    const merged = { ...owner };
    for (const field of ENRICHMENT_FIELDS) merged[field] = local[field];
    if (String(local.image || '').trim()) merged.image = local.image;
    merged.projectId = local.projectId;

    for (const field of Object.keys(owner)) {
      if (['image', 'projectId', ...ENRICHMENT_FIELDS].includes(field)) continue;
      if (JSON.stringify(owner[field]) !== JSON.stringify(local[field])) {
        ownerTextConflicts.push({ id: owner.id, field, owner: owner[field], local: local[field] });
      }
    }
    return merged;
  });

  for (const owner of live.elements) {
    if (currentById.has(String(owner.id))) continue;
    const restoredElement = {
      ...owner,
      projectId: canonicalProjectId(owner.projectId, live.projects, current.projects),
      family: classifyFamily(owner)
    };
    elements.push(restoredElement);
    restored.push(owner.id);
  }

  const familyStats = new Map(FAMILY_ORDER.map((family) => [family, { total: 0, projects: new Set() }]));
  for (const element of elements) {
    if (!familyStats.has(element.family)) element.family = classifyFamily(element);
    const stats = familyStats.get(element.family);
    stats.total += 1;
    stats.projects.add(String(element.projectId));
  }

  for (const element of elements) {
    const stats = familyStats.get(element.family);
    element.freq_videos = stats.projects.size;
    element.freq_total = stats.total;
    element.tier = current.projects.length > 0 && stats.projects.size / current.projects.length >= BASE_VIDEO_THRESHOLD
      ? 'base'
      : 'unique';
  }

  const result = {
    ...current,
    projects: current.projects.map((project) => liveProjectsById.has(String(project.id))
      ? { ...liveProjectsById.get(String(project.id)) }
      : project),
    elements
  };
  fs.writeFileSync(dataPath, `${JSON.stringify(result, null, 2)}\n`);

  const base = elements.filter((element) => element.tier === 'base').length;
  process.stdout.write(`${JSON.stringify({
    liveHash: hash(livePath),
    liveElements: live.elements.length,
    currentElements: current.elements.length,
    commonElements: live.elements.length - restored.length,
    restoredLiveOnly: restored.length,
    retainedCurrentOnly: current.elements.length - (live.elements.length - restored.length),
    finalElements: elements.length,
    projects: current.projects.length,
    base,
    unique: elements.length - base,
    ownerTextConflicts: ownerTextConflicts.length,
    ownerTextConflictFields: [...new Set(ownerTextConflicts.map((item) => item.field))],
    restoredIds: restored,
    rollbackPath
  }, null, 2)}\n`);
}

if (require.main === module) main();
