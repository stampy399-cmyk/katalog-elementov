#!/usr/bin/env node

'use strict';

// Собирает santehnika-data.js для вкладки «САНТЕХНИКА» из готового разбора
// analiz-santehnika-tiers.json. Разбор только читается, ничего не пересчитывается:
// семейства, приёмы и метки элементов берутся как есть.
//
// Формат вывода компактный: элемент хранится тройкой индексов
// [индекс семейства, индекс приёма, индекс метки] — 756 элементов дают ~40 КБ
// вместо ~120 КБ при хранении строк.

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const source = JSON.parse(fs.readFileSync(path.join(root, 'analiz-santehnika-tiers.json'), 'utf8'));

const TIERS = ['base', 'unique', 'gray'];
const TIER_RU = { base: 'базовый набор', unique: 'уникальная вставка', gray: 'серая зона' };

const familyIndex = new Map(source.families.map((entry, index) => [entry.family, index]));
const techniqueIndex = new Map(source.techniques.map((entry, index) => [entry.id, index]));

const familyTierCounts = source.families.map(() => ({ base: 0, unique: 0, gray: 0 }));
const familyElementCounts = source.families.map(() => 0);
const elements = {};

for (const [id, entry] of Object.entries(source.elements)) {
  const family = familyIndex.get(entry.family);
  const technique = techniqueIndex.get(entry.technique_id);
  const tier = TIERS.indexOf(entry.tier);
  if (family === undefined) throw new Error(`unknown family for element ${id}: ${entry.family}`);
  if (technique === undefined) throw new Error(`unknown technique for element ${id}: ${entry.technique_id}`);
  if (tier < 0) throw new Error(`unknown tier for element ${id}: ${entry.tier}`);
  elements[id] = [family, technique, tier];
  familyTierCounts[family][entry.tier] += 1;
  familyElementCounts[family] += 1;
}

const payload = {
  version: 1,
  analysis: source.analysis,
  analysisDate: source.analysis_date,
  niche: source.scope.niche,
  channel: source.scope.channel,
  tiers: TIERS,
  tierNames: TIER_RU,
  thresholds: {
    N: source.thresholds.N,
    M: source.thresholds.M,
    base: source.thresholds.base,
    unique: source.thresholds.unique,
    gray: source.thresholds.gray
  },
  totals: {
    elements: source.totals.source_elements,
    families: source.totals.families,
    techniques: source.totals.techniques,
    videos: source.scope.projects.length,
    elementsByTier: source.totals.elements_by_tier,
    techniquesByTier: source.totals.techniques_by_tier
  },
  projects: source.scope.projects.map((project) => ({
    id: project.id,
    key: project.key,
    title: project.title,
    elements: project.source_elements
  })),
  families: source.families.map((entry, index) => ({
    family: entry.family,
    name: entry.name,
    elements: familyElementCounts[index],
    byTier: familyTierCounts[index],
    techniques: entry.technique_count,
    techniqueTiers: entry.technique_tiers,
    coverage: entry.coverage
  })),
  techniques: source.techniques.map((entry) => ({
    id: entry.id,
    family: entry.family,
    name: entry.name,
    tier: entry.tier,
    tierRu: entry.tier_ru,
    total: entry.total,
    elements: entry.source_element_count,
    coverage: entry.coverage,
    maxInOneVideo: entry.max_in_one_video
  })),
  elements
};

const totalFromFamilies = payload.families.reduce((total, entry) => total + entry.elements, 0);
if (totalFromFamilies !== payload.totals.elements) throw new Error(`family sum ${totalFromFamilies} !== totals ${payload.totals.elements}`);
const byTier = TIERS.reduce((acc, tier) => ({ ...acc, [tier]: payload.families.reduce((total, entry) => total + entry.byTier[tier], 0) }), {});
for (const tier of TIERS) {
  if (byTier[tier] !== payload.totals.elementsByTier[tier]) throw new Error(`tier ${tier}: ${byTier[tier]} !== ${payload.totals.elementsByTier[tier]}`);
}

const target = path.join(root, 'santehnika-data.js');
fs.writeFileSync(target, `window.SANTEHNIKA=${JSON.stringify(payload)};\n`);
process.stdout.write(`${JSON.stringify({ file: path.basename(target), bytes: fs.statSync(target).size, elements: Object.keys(elements).length, families: payload.families.length, techniques: payload.techniques.length, byTier })}\n`);
