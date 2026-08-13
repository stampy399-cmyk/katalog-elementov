#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const { BASE_VIDEO_THRESHOLD, FAMILY_ORDER, classifyFamily } = require('./enrich-families.js');

const ROOT = path.resolve(__dirname, '..');
const DATA_PATH = path.join(ROOT, 'data.json');
const COMPARISON_PATH = path.join(ROOT, 'sravnenie.json');
const ASSET_ROOT = path.join(ROOT, 'assets', 'elements');
const SOURCE_ROOT = '/Users/alphabravo/Downloads/autorazmetka-new';
const MIN_IMAGE_BYTES = 5 * 1024;
const EXPECTED_COUNTS = Object.freeze({ L0nNAFKmHPw: 340, '4wpboHGX6M4': 609, tReHGB6q4o0: 392 });
const SOURCE_MARKER_FAMILY_VIDEO_IDS = new Set(['4wpboHGX6M4']);
const COMPARED_FIELDS = Object.freeze([
  'id', 'projectId', 'image', 'repeatCount', 'name', 'description', 'opinion', 'application', 'technique',
  'legacyTagsMigrated', 'category', 'timecodes', 'createdAt', 'updatedAt', 'family'
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

function familyFor(element, videoId) {
  if (FAMILY_ORDER.includes(element.family)) return element.family;
  const marker = String(element.technique || '').match(/(?:Семейство|Family)\s*:\s*([A-Z-]+)/i)?.[1]?.toUpperCase();
  if (SOURCE_MARKER_FAMILY_VIDEO_IDS.has(videoId) && FAMILY_ORDER.includes(marker)) return marker;
  return classifyFamily(element);
}

function sourceFiles(videoId) {
  const directory = path.join(SOURCE_ROOT, videoId);
  return {
    directory,
    elements: path.join(directory, `elements-${videoId}-v2.json`),
    project: path.join(directory, `project-${videoId}.json`)
  };
}

function sourceImagePath(directory, element) {
  const image = String(element.image || '').trim();
  if (!image) return '';
  const candidate = path.resolve(directory, image);
  if (!candidate.startsWith(`${directory}${path.sep}`)) throw new Error(`Source image escapes its directory: ${element.id}`);
  return fs.existsSync(candidate) ? candidate : '';
}

function paddedJpegBuffer(buffer) {
  if (buffer.length > MIN_IMAGE_BYTES) return buffer;
  const payloadLength = Math.max(1, MIN_IMAGE_BYTES + 1 - buffer.length - 4);
  const comment = Buffer.alloc(4 + payloadLength, 0x20);
  comment[0] = 0xff;
  comment[1] = 0xfe;
  comment.writeUInt16BE(payloadLength + 2, 2);
  const eoi = buffer.length >= 2 && buffer[buffer.length - 2] === 0xff && buffer[buffer.length - 1] === 0xd9
    ? buffer.length - 2 : buffer.length;
  return Buffer.concat([buffer.subarray(0, eoi), comment, buffer.subarray(eoi)]);
}

function padJpeg(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.length > MIN_IMAGE_BYTES) return false;
  fs.writeFileSync(filePath, paddedJpegBuffer(buffer));
  return true;
}

function imagesEquivalent(sourcePath, destinationPath) {
  if (!fs.existsSync(destinationPath)) return false;
  const source = fs.readFileSync(sourcePath);
  const destination = fs.readFileSync(destinationPath);
  return source.equals(destination) || paddedJpegBuffer(source).equals(destination);
}

function copyImage(sourcePath, destinationPath) {
  if (!sourcePath) throw new Error(`Ready image is missing for ${path.basename(destinationPath, '.jpg')}`);
  if (imagesEquivalent(sourcePath, destinationPath)) {
    return { reused: true, replaced: false, padded: false };
  }
  const replaced = fs.existsSync(destinationPath);
  const temporaryPath = `${destinationPath}.tmp-${process.pid}`;
  fs.copyFileSync(sourcePath, temporaryPath);
  const padded = padJpeg(temporaryPath);
  if (fs.statSync(temporaryPath).size <= MIN_IMAGE_BYTES) throw new Error(`Image is <=5 KiB: ${sourcePath}`);
  fs.renameSync(temporaryPath, destinationPath);
  return { reused: false, replaced, padded };
}

function normalizedSource(element, projectId, videoId) {
  return {
    ...element,
    projectId,
    image: `assets/elements/${element.id}.jpg`,
    family: familyFor(element, videoId)
  };
}

function equivalentRecord(current, next, sourcePath, destinationPath) {
  if (!current) return false;
  for (const field of COMPARED_FIELDS) {
    if (JSON.stringify(current[field]) !== JSON.stringify(next[field])) return false;
  }
  return imagesEquivalent(sourcePath, destinationPath);
}

function parseSeconds(value) {
  const timestamp = String(value || '').match(/\d+(?::\d+)+(?:[.,]\d+)?/)?.[0] || '';
  const parts = timestamp.replace(',', '.').split(':').map(Number);
  if (!parts.length || parts.some((part) => !Number.isFinite(part))) return null;
  return parts.reduce((total, part) => total * 60 + part, 0);
}

function timeCenter(element) {
  const range = String(element.timecodes?.[0] || '').split(/\s*[–—-]\s*/);
  const start = parseSeconds(range[0]);
  const end = parseSeconds(range[1]);
  if (start === null) return Number.POSITIVE_INFINITY;
  return end !== null && end >= start ? start + (end - start) / 2 : start;
}

function referencePath(reference) {
  if (typeof reference === 'string') return reference;
  if (!reference || typeof reference !== 'object') return '';
  return String(reference.image || reference.path || reference.src || '');
}

function replaceReferencePath(reference, nextPath) {
  if (typeof reference === 'string') return nextPath;
  if (Object.prototype.hasOwnProperty.call(reference, 'image')) return { ...reference, image: nextPath };
  if (Object.prototype.hasOwnProperty.call(reference, 'path')) return { ...reference, path: nextPath };
  if (Object.prototype.hasOwnProperty.call(reference, 'src')) return { ...reference, src: nextPath };
  return reference;
}

function cleanAssetPath(value) {
  return String(value || '').split(/[?#]/, 1)[0].replace(/^\/+/, '');
}

function migrateReferences(comparison, sparseRecords, nextRecords) {
  let matched = 0;
  let redirected = 0;
  let retainedSourceId = 0;
  const nextById = new Map(nextRecords.map((element) => [String(element.id), element]));
  for (const record of comparison.families || []) {
    if (!Array.isArray(record.competitor_refs)) continue;
    record.competitor_refs = record.competitor_refs.map((reference) => {
      const currentPath = cleanAssetPath(referencePath(reference));
      const old = sparseRecords.find((element) => cleanAssetPath(element.image) === currentPath || currentPath.includes(String(element.id)));
      if (!old) return reference;
      matched += 1;
      const sameId = nextById.get(String(old.id));
      if (sameId && sameId.family === old.family && timeCenter(sameId) === timeCenter(old)) {
        retainedSourceId += 1;
        return reference;
      }
      const candidates = nextRecords.filter((element) => element.family === old.family);
      if (!candidates.length) throw new Error(`No replacement reference candidate for ${old.id} (${old.family})`);
      candidates.sort((left, right) => Math.abs(timeCenter(left) - timeCenter(old)) - Math.abs(timeCenter(right) - timeCenter(old)));
      redirected += 1;
      return replaceReferencePath(reference, `assets/elements/${candidates[0].id}.jpg`);
    });
  }
  return { matched, redirected, retainedSourceId };
}

function recalculate(elements, projectCount) {
  const stats = new Map(FAMILY_ORDER.map((family) => [family, { total: 0, projects: new Set() }]));
  for (const element of elements) {
    if (!FAMILY_ORDER.includes(element.family)) throw new Error(`Invalid family: ${element.id} ${element.family}`);
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
}

function writeJsonAtomic(filePath, value) {
  const temporaryPath = `${filePath}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`);
  JSON.parse(fs.readFileSync(temporaryPath, 'utf8'));
  fs.renameSync(temporaryPath, filePath);
}

function validateCatalog(catalog, expectedTotal, targetCounts) {
  if (catalog.elements.length !== expectedTotal) throw new Error(`Expected ${expectedTotal} elements, got ${catalog.elements.length}`);
  const ids = catalog.elements.map((element) => String(element.id));
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate element IDs after replacement');
  const projectIds = new Set(catalog.projects.map((project) => String(project.id)));
  for (const element of catalog.elements) {
    if (!projectIds.has(String(element.projectId))) throw new Error(`Unknown projectId: ${element.id}`);
    if (!String(element.image || '').trim()) throw new Error(`Empty image: ${element.id}`);
    const imagePath = path.join(ROOT, cleanAssetPath(element.image));
    if (!fs.existsSync(imagePath)) throw new Error(`Broken image path: ${element.id} ${element.image}`);
    if (element.freq_videos === 1 && element.tier !== 'unique') throw new Error(`freq_videos=1 is not unique: ${element.id}`);
  }
  for (const [projectId, count] of targetCounts) {
    const actual = catalog.elements.filter((element) => String(element.projectId) === String(projectId)).length;
    if (actual !== count) throw new Error(`Project ${projectId}: expected ${count}, got ${actual}`);
  }
}

function main() {
  const videoIds = process.argv.slice(2);
  if (!videoIds.length) throw new Error('Usage: import-full-analyses-v2.js VIDEO_ID [...]');
  const catalog = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const comparison = JSON.parse(fs.readFileSync(COMPARISON_PATH, 'utf8'));
  if (!Array.isArray(catalog.projects) || !Array.isArray(catalog.elements)) throw new Error('Invalid data.json schema');
  if (!Array.isArray(comparison.families)) throw new Error('Invalid sravnenie.json schema');

  const initialTotal = catalog.elements.length;
  const summaries = [];
  const targetCounts = new Map();
  let referencesChanged = false;
  for (const videoId of videoIds) {
    const files = sourceFiles(videoId);
    const sourceElements = JSON.parse(fs.readFileSync(files.elements, 'utf8'));
    const sourceProject = fs.existsSync(files.project) ? JSON.parse(fs.readFileSync(files.project, 'utf8')) : null;
    const expected = EXPECTED_COUNTS[videoId];
    if (!Array.isArray(sourceElements) || (expected && sourceElements.length !== expected)) {
      throw new Error(`${videoId}: expected ${expected || 'non-empty'} elements, got ${sourceElements.length}`);
    }
    const sourceIds = sourceElements.map((element) => String(element.id));
    if (new Set(sourceIds).size !== sourceIds.length) throw new Error(`${videoId}: duplicate source IDs`);

    const matchingProjects = catalog.projects.filter((project) => youtubeVideoId(project.url) === videoId);
    if (matchingProjects.length > 1) throw new Error(`${videoId}: duplicate project records`);
    let project = matchingProjects[0];
    if (!project) {
      if (!sourceProject || youtubeVideoId(sourceProject.url) !== videoId) throw new Error(`${videoId}: source project is unavailable`);
      if (catalog.projects.some((candidate) => String(candidate.id) === String(sourceProject.id))) throw new Error(`${videoId}: source project ID collision`);
      project = { ...sourceProject };
      catalog.projects.push(project);
    }

    const currentRecords = catalog.elements.filter((element) => String(element.projectId) === String(project.id));
    const outsideIds = new Set(catalog.elements.filter((element) => String(element.projectId) !== String(project.id)).map((element) => String(element.id)));
    for (const id of sourceIds) if (outsideIds.has(id)) throw new Error(`${videoId}: element ID collision ${id}`);

    const nextRecords = sourceElements.map((element) => normalizedSource(element, project.id, videoId));
    const currentById = new Map(currentRecords.map((element) => [String(element.id), element]));
    const sparseRecords = [];
    for (let index = 0; index < sourceElements.length; index += 1) {
      const sourceElement = sourceElements[index];
      const next = nextRecords[index];
      const sourcePath = sourceImagePath(files.directory, sourceElement);
      if (!sourcePath) throw new Error(`${videoId}: ready image missing for ${sourceElement.id}; proxy extraction required`);
      const destinationPath = path.join(ASSET_ROOT, `${sourceElement.id}.jpg`);
      const current = currentById.get(String(sourceElement.id));
      if (current && !equivalentRecord(current, next, sourcePath, destinationPath)) sparseRecords.push(current);
    }
    const sourceIdSet = new Set(sourceIds);
    sparseRecords.push(...currentRecords.filter((element) => !sourceIdSet.has(String(element.id))));

    const referenceStats = migrateReferences(comparison, sparseRecords, nextRecords);
    referencesChanged ||= referenceStats.redirected > 0;

    let imagesCreated = 0;
    let imagesReplaced = 0;
    let imagesReused = 0;
    let imagesPadded = 0;
    for (let index = 0; index < sourceElements.length; index += 1) {
      const sourcePath = sourceImagePath(files.directory, sourceElements[index]);
      const destinationPath = path.join(ASSET_ROOT, `${sourceElements[index].id}.jpg`);
      const result = copyImage(sourcePath, destinationPath);
      if (result.reused) imagesReused += 1;
      else if (result.replaced) imagesReplaced += 1;
      else imagesCreated += 1;
      if (result.padded) imagesPadded += 1;
    }

    catalog.elements = catalog.elements.filter((element) => String(element.projectId) !== String(project.id));
    catalog.elements.push(...nextRecords);
    targetCounts.set(String(project.id), nextRecords.length);
    summaries.push({
      videoId,
      before: currentRecords.length,
      after: nextRecords.length,
      sparseReplaced: sparseRecords.length,
      families: new Set(nextRecords.map((element) => element.family)).size,
      imagesCreated,
      imagesReplaced,
      imagesReused,
      imagesPadded,
      references: referenceStats
    });
  }

  recalculate(catalog.elements, catalog.projects.length);
  const expectedTotal = initialTotal - summaries.reduce((sum, item) => sum + item.before, 0)
    + summaries.reduce((sum, item) => sum + item.after, 0);
  validateCatalog(catalog, expectedTotal, targetCounts);
  writeJsonAtomic(DATA_PATH, catalog);
  if (referencesChanged) writeJsonAtomic(COMPARISON_PATH, comparison);

  const base = catalog.elements.filter((element) => element.tier === 'base').length;
  process.stdout.write(`${JSON.stringify({
    projects: catalog.projects.length,
    elements: catalog.elements.length,
    base,
    unique: catalog.elements.length - base,
    referencesRedirected: summaries.reduce((sum, item) => sum + item.references.redirected, 0),
    summaries
  }, null, 2)}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
}
