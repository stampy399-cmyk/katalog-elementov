#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const source = JSON.parse(fs.readFileSync(path.join(root, 'data.json'), 'utf8'));
const ownerBaseline = JSON.parse(fs.readFileSync(path.join(root, 'data.backup-20260813.json'), 'utf8'));
fs.writeFileSync(path.join(root, 'catalog-data.js'), `window.PUBLISHED_CATALOG=${JSON.stringify(source)};\n`);
fs.writeFileSync(path.join(root, 'owner-baseline-data.js'), `window.OWNER_BASELINE=${JSON.stringify(ownerBaseline)};\n`);
process.stdout.write(`${JSON.stringify({ projects: source.projects.length, elements: source.elements.length, ownerBaseline: ownerBaseline.elements.length })}\n`);
