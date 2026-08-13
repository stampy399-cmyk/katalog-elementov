#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'sravnenie.json');
const outputPath = path.join(root, 'sravnenie-data.js');
const assetsDir = path.join(root, 'assets', 'ours');
const clipLimit = 10 * 1024 * 1024;

function localPath(relativePath) {
  return path.join(root, String(relativePath || '').replace(/^\/+/, ''));
}

function assetName(family, extension) {
  return `${String(family).toLowerCase().replace(/[^a-z0-9]+/g, '-')}${extension}`;
}

function makePoster(source, destination) {
  const result = spawnSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y', '-ss', '0.5', '-i', source,
    '-frames:v', '1', '-vf', "scale='min(1280,iw)':-2", '-q:v', '3', destination
  ], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || `ffmpeg failed for ${source}`);
}

function main() {
  const comparison = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  fs.mkdirSync(assetsDir, { recursive: true });

  for (const entry of comparison.families) {
    if (!entry.our_media) {
      entry.our_media = null;
      entry.our_poster = null;
      continue;
    }

    const existingRelative = !path.isAbsolute(entry.our_media) && entry.our_media.startsWith('assets/ours/');
    if (existingRelative) {
      if (!fs.existsSync(localPath(entry.our_media))) throw new Error(`Missing ${entry.our_media}`);
      if (entry.our_poster && !fs.existsSync(localPath(entry.our_poster))) throw new Error(`Missing ${entry.our_poster}`);
      continue;
    }

    const source = path.resolve(entry.our_media);
    if (!fs.existsSync(source)) throw new Error(`Missing source: ${source}`);
    const extension = path.extname(source).toLowerCase();
    if (!['.mp4', '.png', '.jpg', '.jpeg', '.webp'].includes(extension)) {
      throw new Error(`Unsupported media: ${source}`);
    }
    if (extension === '.mp4' && fs.statSync(source).size >= clipLimit) {
      throw new Error(`Clip is 10 MiB or larger: ${source}`);
    }

    const mediaName = assetName(entry.family, extension);
    const mediaRelative = `assets/ours/${mediaName}`;
    const mediaDestination = localPath(mediaRelative);
    fs.copyFileSync(source, mediaDestination);
    entry.our_media = mediaRelative;

    if (extension === '.mp4') {
      const posterRelative = `assets/ours/${assetName(entry.family, '.jpg')}`;
      makePoster(source, localPath(posterRelative));
      entry.our_poster = posterRelative;
    } else {
      entry.our_poster = mediaRelative;
    }
  }

  fs.writeFileSync(sourcePath, `${JSON.stringify(comparison, null, 2)}\n`);
  fs.writeFileSync(outputPath, `window.SRAVNENIE=${JSON.stringify(comparison)};\n`);
  process.stdout.write(`${JSON.stringify({
    families: comparison.families.length,
    withMedia: comparison.families.filter((entry) => entry.our_media).length,
    clips: comparison.families.filter((entry) => String(entry.our_media).endsWith('.mp4')).length,
    stills: comparison.families.filter((entry) => entry.our_media && !String(entry.our_media).endsWith('.mp4')).length
  })}\n`);
}

if (require.main === module) main();
