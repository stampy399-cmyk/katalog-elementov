#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'sravnenie.json');
const outputPath = path.join(root, 'sravnenie-data.js');

function localPath(relativePath) {
  return path.join(root, String(relativePath || '').replace(/^\/+/, ''));
}

function main() {
  const comparison = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  const pairs = comparison.families.flatMap((entry) => entry.pairs || []);
  const ourMedia = new Set();
  const competitorMedia = new Set();

  if (comparison.version !== 4) throw new Error(`Expected comparison version 4, got ${comparison.version}`);
  if (comparison.families.length !== 16 || pairs.length !== 42) {
    throw new Error(`Expected 16 families and 42 pairs, got ${comparison.families.length} and ${pairs.length}`);
  }
  if (comparison.families.some((entry) => !Array.isArray(entry.pairs) || !entry.pairs.length)) {
    throw new Error('Every comparison family must contain at least one pair');
  }

  for (const entry of comparison.families) {
    for (const pair of entry.pairs) {
      if (!/^assets\/ours\/pairs\/[a-z0-9-]+-ours\.mp4$/.test(pair.our_media || '')) {
        throw new Error(`${entry.family}: invalid our_media ${pair.our_media}`);
      }
      if (!/^assets\/clips\/[a-z0-9-]+\.mp4$/.test(pair.competitor_media || '')) {
        throw new Error(`${entry.family}: invalid competitor_media ${pair.competitor_media}`);
      }
      const ourStem = path.basename(pair.our_media, '.mp4');
      const competitorStem = path.basename(pair.competitor_media, '.mp4');
      if (ourStem !== `${competitorStem}-ours`) throw new Error(`${entry.family}: pair stem mismatch`);
      if (!fs.existsSync(localPath(pair.our_media))) throw new Error(`${entry.family}: missing ${pair.our_media}`);
      if (!fs.existsSync(localPath(pair.competitor_media))) throw new Error(`${entry.family}: missing ${pair.competitor_media}`);
      if (ourMedia.has(pair.our_media)) throw new Error(`${entry.family}: duplicate ${pair.our_media}`);
      if (competitorMedia.has(pair.competitor_media)) throw new Error(`${entry.family}: duplicate ${pair.competitor_media}`);
      ourMedia.add(pair.our_media);
      competitorMedia.add(pair.competitor_media);
    }
  }

  fs.writeFileSync(outputPath, `window.SRAVNENIE=${JSON.stringify(comparison)};\n`);
  process.stdout.write(`${JSON.stringify({
    families: comparison.families.length,
    pairs: pairs.length,
    ourClips: ourMedia.size,
    competitorClips: competitorMedia.size
  })}\n`);
}

if (require.main === module) main();
