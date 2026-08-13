#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

const BASE_VIDEO_THRESHOLD = 0.5;
const FAMILY_ORDER = Object.freeze([
  'KEYFRAMES-MOTION',
  'PHOTO-IMAGE',
  'HARD-CUT',
  'OPACITY-FADE',
  'INSET-WINDOW',
  'SCALE-ZOOM',
  'TEXT-TYPOGRAPHY',
  'POSITION-SLIDE',
  'GRID-LINES',
  'LIGHT-GLOW',
  'SATURATION-COLOR',
  'OTHER',
  'CROSSFADE',
  'BLEND-MODE',
  'GEOMETRY-SHAPE',
  'EMPTY',
  'CAMERA-MOTION',
  'BLUR-EFFECT'
]);

const FAMILY_RULES = Object.freeze([
  rule('BLUR-EFFECT', /\b(?:gaussian|directional|motion|lens|box)\s+blur\b|\bblur(?:red|ring)?\b|размыт/i, /soften|defocus|расфокус/i),
  rule('CAMERA-MOTION', /\b(?:camera|drone|aerial|dolly|handheld|rack\s+focus|orbit)\b|камер|аэро|дрон/i, /\b(?:parallax|pan(?:ning)?)\b|параллакс|панорам/i),
  rule('BLEND-MODE', /\b(?:blend\s*mode|screen\s+blend|soft\s+light|overlay\s+blend|multiply\s+blend|linear\s+dodge|add\s+blend)\b|режим[ае]?\s+наложения/i, /\b(?:screen|overlay|multiply|add)\b/i),
  rule('CROSSFADE', /\b(?:cross[ -]?fade|cross\s+dissolve)\b|кроссфейд|перекр[её]стн(?:ый|ое)\s+раствор/i, /\bdissolve\b|растворени/i),
  rule('SATURATION-COLOR', /\b(?:saturation|desaturat(?:e|ed|ion)|color\s+(?:grade|grading|correction)|black\s*(?:and|&)\s*white|monochrome)\b|сатурац|насыщенн|обесцвеч|цветокорр|ч[её]рно-бел/i, /\b(?:tint|hue|curves|levels|color)\b|цвет/i),
  rule('LIGHT-GLOW', /\b(?:glow|light\s*(?:leak|ray|streak|flash|burst)|lens\s+flare|film[ -]?burn|overexpos|bloom)\b|свечени|засвет|блик|вспышк|светов/i, /\b(?:flare|exposure|light)\b|свет/i),
  rule('GRID-LINES', /\b(?:grid|gridline|guide\s*line|scanline|line[- ]art|technical\s+line)\b|сетк|линии\s+(?:сетки|разметки)/i, /\b(?:line|stroke)\b|линии|линейн/i),
  rule('INSET-WINDOW', /\b(?:inset|picture[- ]in[- ]picture|split[- ]screen|media\s+card|window)\b|врезк|сплит-скрин|окн(?:о|а)/i, /\b(?:frame|card|panel|border)\b|рамк|карточк|плашк/i),
  rule('GEOMETRY-SHAPE', /\b(?:shape|rectangle|circle|polygon|geometry|geometric|ellipse)\b|геометр|прямоуголь|окружност|фигур/i, /\b(?:square|triangle|block)\b|круг/i),
  rule('TEXT-TYPOGRAPHY', /\b(?:typograph|headline|lower[- ]third|serif|sans[- ]serif|font)\b|типограф|заголов|подзаголов|надпис|шрифт|титр/i, /\b(?:text|title|subtitle|caption|label|number|counter)\b|текст|цифр|числ/i),
  rule('SCALE-ZOOM', /\b(?:scale|zoom|push[- ]in|pull[- ]out|punch[- ]in)\b|масштаб|зум|приближ|отдален/i, /увелич|уменьш/i),
  rule('POSITION-SLIDE', /\b(?:position|slide|swipe|wipe|translate)\b|позици|сдвиг|слайд|смещ/i, /\b(?:pan|drift|move)\b|движется|уходит/i),
  rule('OPACITY-FADE', /\b(?:opacity|fade(?:d|s|in|out)?)\b|прозрач|прояв|исчез/i, /\b(?:reveal|appear|disappear)\b|появ/i),
  rule('HARD-CUT', /\b(?:hard\s+cut|smash\s+cut|clean\s+cut|jump\s+cut|cut\s+0\s+frames)\b|резк(?:ая|ую|ой)\s+склейк|склейк[аи]\s+0\s+кадр/i, /\bcut\b|склейк/i),
  rule('PHOTO-IMAGE', /\b(?:photo|image|picture|footage|b-roll|still|screenshot|illustration|archive)\b|фото|изображ|футаж|иллюстрац|архивн/i, /\b(?:document|map|portrait)\b|документ|карт[аыуе]\b/i),
  rule('KEYFRAMES-MOTION', /\b(?:keyframe|motion\s+graphics|ease[- ]?in|ease[- ]?out|easing)\b|ключев(?:ой|ые)\s+кадр/i, /\b(?:animation|animated|motion|transform)\b|анимац|движени/i)
]);

const FIELD_WEIGHTS = Object.freeze({
  name: 6,
  technique: 5,
  category: 3,
  description: 2,
  application: 1,
  opinion: 1
});

const CATEGORY_BIASES = Object.freeze({
  'Зум': 'SCALE-ZOOM',
  'Типографика': 'TEXT-TYPOGRAPHY',
  'Частицы': 'LIGHT-GLOW',
  'Работа с футажем': 'PHOTO-IMAGE',
  'Инфографика': 'GRID-LINES',
  'Переход': 'KEYFRAMES-MOTION'
});

const MIN_FAMILY_SCORE = 9;
const root = path.resolve(__dirname, '..');
const dataPath = path.join(root, 'data.json');
const backupPath = path.join(root, 'data.backup-20260813.json');
const comparisonPath = path.join(root, 'sravnenie.json');

function rule(family, strong, weak) {
  return Object.freeze({ family, strong, weak });
}

function scoreRule(element, definition) {
  let score = 0;
  for (const [field, weight] of Object.entries(FIELD_WEIGHTS)) {
    const value = String(element[field] || '');
    if (definition.strong.test(value)) score += weight * 3;
    else if (definition.weak.test(value)) score += weight;
  }
  if (CATEGORY_BIASES[element.category] === definition.family) score += 2;
  return score;
}

function classifyFamily(element) {
  if (!String(element.technique || '').trim()) return 'EMPTY';
  let family = 'OTHER';
  let bestScore = 0;
  for (const definition of FAMILY_RULES) {
    const score = scoreRule(element, definition);
    if (score > bestScore) {
      family = definition.family;
      bestScore = score;
    }
  }
  return bestScore >= MIN_FAMILY_SCORE ? family : 'OTHER';
}

function main() {
  const source = fs.readFileSync(dataPath, 'utf8');
  const data = JSON.parse(source);
  if (!Array.isArray(data.projects) || !Array.isArray(data.elements)) {
    throw new Error('data.json must contain projects and elements arrays');
  }
  if (!fs.existsSync(backupPath)) fs.copyFileSync(dataPath, backupPath);

  const classified = data.elements.map((element) => ({
    ...element,
    family: classifyFamily(element)
  }));
  const familyStats = new Map(FAMILY_ORDER.map((family) => [family, { total: 0, projects: new Set() }]));
  for (const element of classified) {
    const stats = familyStats.get(element.family);
    stats.total += 1;
    stats.projects.add(String(element.projectId));
  }

  const projectCount = data.projects.length;
  data.elements = classified.map((element) => {
    const stats = familyStats.get(element.family);
    const freqVideos = stats.projects.size;
    return {
      ...element,
      freq_videos: freqVideos,
      freq_total: stats.total,
      tier: projectCount > 0 && freqVideos / projectCount >= BASE_VIDEO_THRESHOLD ? 'base' : 'unique'
    };
  });

  let existingComparison = { families: [] };
  if (fs.existsSync(comparisonPath)) {
    existingComparison = JSON.parse(fs.readFileSync(comparisonPath, 'utf8'));
  }
  const comparisonByFamily = new Map((existingComparison.families || []).map((record) => [record.family, record]));
  const comparison = {
    version: 1,
    families: FAMILY_ORDER.map((family) => comparisonByFamily.get(family) || ({ family, our_media: null, level: 'нет', notes: '' }))
  };

  fs.writeFileSync(dataPath, `${JSON.stringify(data, null, 2)}\n`);
  fs.writeFileSync(comparisonPath, `${JSON.stringify(comparison, null, 2)}\n`);

  const base = data.elements.filter((element) => element.tier === 'base').length;
  const unique = data.elements.length - base;
  const summary = [...familyStats].map(([family, stats]) => ({
    family,
    elements: stats.total,
    videos: stats.projects.size,
    tier: projectCount > 0 && stats.projects.size / projectCount >= BASE_VIDEO_THRESHOLD ? 'base' : 'unique'
  }));
  process.stdout.write(`${JSON.stringify({ projects: projectCount, elements: data.elements.length, families: summary.length, base, unique, threshold: BASE_VIDEO_THRESHOLD, summary }, null, 2)}\n`);
}

module.exports = Object.freeze({ BASE_VIDEO_THRESHOLD, FAMILY_ORDER, classifyFamily });

if (require.main === module) main();
