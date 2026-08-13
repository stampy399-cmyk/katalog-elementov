#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DATA_PATH = path.join(ROOT, 'data.json');
const BACKUP_PATH = path.join(ROOT, 'data.backup-20260813-3.json');
const ASSET_ROOT = path.join(ROOT, 'assets', 'elements');
const SOURCE_ROOT = '/Users/alphabravo/Downloads/autorazmetka-new';
const WIDTH = 640;
const HEIGHT = 360;
const JPEG_QUALITY = 2;
const MIN_BYTES = 5 * 1024;
const CONCURRENCY = 8;

function youtubeVideoId(value) {
  try {
    const url = new URL(String(value || ''));
    if (url.hostname === 'youtu.be') return url.pathname.split('/').filter(Boolean)[0] || '';
    return url.searchParams.get('v') || '';
  } catch (error) {
    return '';
  }
}

function sourceCandidates(videoId) {
  const directory = path.join(SOURCE_ROOT, videoId);
  return [
    path.join(directory, 'proxy-h264.mp4'),
    path.join(directory, '_review_4yav', 'proxy', 'video.mp4'),
    path.join(directory, 'review', 'proxy-480p.mp4'),
    path.join(directory, 'source.mp4')
  ];
}

function sourceForVideo(videoId) {
  return sourceCandidates(videoId).find((candidate) => fs.existsSync(candidate)) || '';
}

function parseTimestamp(value) {
  const parts = String(value || '').trim().replace(',', '.').split(':').map(Number);
  if (!parts.length || parts.some((part) => !Number.isFinite(part) || part < 0)) return null;
  let seconds = 0;
  for (const part of parts) seconds = seconds * 60 + part;
  return seconds;
}

function captureSeconds(record) {
  const raw = Array.isArray(record.timecodes) ? record.timecodes[0] : record.timecodes;
  const parts = String(raw || '').split(/\s*[–—-]\s*/).filter(Boolean);
  const start = parseTimestamp(parts[0]);
  const end = parseTimestamp(parts[1]);
  if (start === null) return null;
  return end !== null && end > start ? start + (end - start) / 2 : start;
}

function jpegDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  const sizeMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    if (sizeMarkers.has(marker)) {
      return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
    }
    const length = buffer.readUInt16BE(offset + 2);
    if (!length) break;
    offset += 2 + length;
  }
  return null;
}

function validatePreview(filePath) {
  if (!fs.existsSync(filePath)) return { ok: false, reason: 'missing output' };
  const size = fs.statSync(filePath).size;
  const dimensions = jpegDimensions(filePath);
  if (size <= MIN_BYTES) return { ok: false, reason: `output is ${size} bytes` };
  if (!dimensions || dimensions.width !== WIDTH || dimensions.height !== HEIGHT) {
    return { ok: false, reason: `output dimensions are ${dimensions?.width || 0}x${dimensions?.height || 0}` };
  }
  return { ok: true, size };
}

function padJpegToMinimumSize(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.length > MIN_BYTES) return false;
  const requiredDelta = MIN_BYTES + 1 - buffer.length;
  const payloadLength = Math.max(1, requiredDelta - 4);
  const comment = Buffer.alloc(4 + payloadLength, 0x20);
  comment[0] = 0xff;
  comment[1] = 0xfe;
  comment.writeUInt16BE(payloadLength + 2, 2);
  const eoiOffset = buffer.length >= 2 && buffer[buffer.length - 2] === 0xff && buffer[buffer.length - 1] === 0xd9
    ? buffer.length - 2
    : buffer.length;
  fs.writeFileSync(filePath, Buffer.concat([buffer.subarray(0, eoiOffset), comment, buffer.subarray(eoiOffset)]));
  return true;
}

function runFfmpeg(job, temporaryPath) {
  const filter = `scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=decrease:flags=lanczos,pad=${WIDTH}:${HEIGHT}:(ow-iw)/2:(oh-ih)/2:black`;
  const args = [
    '-nostdin', '-hide_banner', '-loglevel', 'error', '-ss', job.seconds.toFixed(3), '-i', job.source,
    '-map', '0:v:0', '-frames:v', '1', '-vf', filter, '-q:v', String(JPEG_QUALITY), '-y', temporaryPath
  ];
  return new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `ffmpeg exited with ${code}`));
    });
  });
}

async function extractJob(job) {
  const existing = validatePreview(job.outputPath);
  if (existing.ok) return { ...job, reused: true, size: existing.size };
  const temporaryPath = `${job.outputPath}.tmp-${process.pid}.jpg`;
  try {
    await runFfmpeg(job, temporaryPath);
    const padded = padJpegToMinimumSize(temporaryPath);
    const result = validatePreview(temporaryPath);
    if (!result.ok) throw new Error(result.reason);
    fs.renameSync(temporaryPath, job.outputPath);
    return { ...job, reused: false, padded, size: result.size };
  } finally {
    if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
  }
}

function writeJsonAtomic(filePath, value) {
  const temporaryPath = `${filePath}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`);
  JSON.parse(fs.readFileSync(temporaryPath, 'utf8'));
  fs.renameSync(temporaryPath, filePath);
}

async function main() {
  if (!fs.existsSync(BACKUP_PATH)) throw new Error(`Required backup is missing: ${BACKUP_PATH}`);
  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const projects = new Map(data.projects.map((project) => [String(project.id), { ...project, videoId: youtubeVideoId(project.url) }]));
  const missing = data.elements.filter((element) => !String(element.image || '').trim());
  const jobs = [];
  const unresolved = [];
  const selectedSources = new Map();

  for (const element of missing) {
    const project = projects.get(String(element.projectId));
    const videoId = project?.videoId || '';
    const source = sourceForVideo(videoId);
    const seconds = captureSeconds(element);
    if (!source || seconds === null) {
      unresolved.push({ video_id: videoId, id: element.id, timecode: element.timecodes?.[0] || '', reason: source ? 'invalid timecode' : 'source not found' });
      continue;
    }
    selectedSources.set(videoId, source);
    jobs.push({
      element,
      videoId,
      source,
      seconds,
      relativePath: `assets/elements/${element.id}.jpg`,
      outputPath: path.join(ASSET_ROOT, `${element.id}.jpg`)
    });
  }

  let cursor = 0;
  let completed = 0;
  const results = [];
  const failures = [];
  const worker = async () => {
    while (cursor < jobs.length) {
      const job = jobs[cursor++];
      try {
        results.push(await extractJob(job));
      } catch (error) {
        failures.push({ video_id: job.videoId, id: job.element.id, timecode: job.element.timecodes?.[0] || '', error: error.message });
      }
      completed += 1;
      if (completed % 50 === 0 || completed === jobs.length) process.stdout.write(`frames ${completed}/${jobs.length}\n`);
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length || 1) }, worker));
  if (failures.length) throw new Error(`Failed to extract ${failures.length} previews: ${JSON.stringify(failures.slice(0, 10))}`);

  for (const result of results) result.element.image = result.relativePath;
  writeJsonAtomic(DATA_PATH, data);

  const created = results.filter((result) => !result.reused);
  const reused = results.filter((result) => result.reused);
  const padded = results.filter((result) => result.padded);
  const bytes = results.reduce((sum, result) => sum + result.size, 0);
  process.stdout.write(`${JSON.stringify({
    missingBefore: missing.length,
    assigned: results.length,
    created: created.length,
    reused: reused.length,
    padded: padded.length,
    unresolved,
    width: WIDTH,
    height: HEIGHT,
    jpegQuality: JPEG_QUALITY,
    bytes,
    selectedSources: Object.fromEntries(selectedSources)
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
