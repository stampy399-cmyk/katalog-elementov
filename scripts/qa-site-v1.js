#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const FAMILY_ORDER = [
  'KEYFRAMES-MOTION', 'PHOTO-IMAGE', 'HARD-CUT', 'OPACITY-FADE', 'INSET-WINDOW', 'SCALE-ZOOM',
  'TEXT-TYPOGRAPHY', 'POSITION-SLIDE', 'GRID-LINES', 'LIGHT-GLOW', 'SATURATION-COLOR', 'OTHER',
  'CROSSFADE', 'BLEND-MODE', 'GEOMETRY-SHAPE', 'EMPTY', 'CAMERA-MOTION', 'BLUR-EFFECT'
];
const VIDEO_COMPARISON = Object.freeze({
  'KEYFRAMES-MOTION': 3,
  'PHOTO-IMAGE': 3,
  'HARD-CUT': 3,
  'OPACITY-FADE': 1,
  'INSET-WINDOW': 3,
  'SCALE-ZOOM': 3,
  'TEXT-TYPOGRAPHY': 2,
  'POSITION-SLIDE': 2,
  'GRID-LINES': 2,
  'LIGHT-GLOW': 3,
  'SATURATION-COLOR': 3,
  CROSSFADE: 3,
  'BLEND-MODE': 3,
  'GEOMETRY-SHAPE': 3,
  'CAMERA-MOTION': 2,
  'BLUR-EFFECT': 3
});
const COMPARISON_FAMILY_ORDER = FAMILY_ORDER.filter((family) => !['OTHER', 'EMPTY'].includes(family));
const COMPARISON_EXPECTED = Object.freeze({ families: 16, cards: 16, pairs: 42, abilities: 167, exact: 121, partial: 46, unavailable: 0, sampleButtons: 0, repoSamples: 30 });
const FORBIDDEN_COMPARISON_TEXT = [
  'TODO:', 'DEBUG', 'placeholder', 'Нашего образца пока нет', 'Референсов нет',
  'Комментарий не добавлен', 'семейство не входило в визуальную сверку', 'undefined', 'null'
];
const EXPECTED = Object.freeze({ projects: 9, elements: 2852, base: 2780, unique: 72, families: 18, imported: 624, abilities: 216, exact: 154, partial: 60, unavailable: 2, repoSamples: 32 });
const failures = [];
let assertions = 0;

function check(condition, message) {
  assertions += 1;
  if (!condition) failures.push(message);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
}

function inlineScript(file) {
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const scripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter((match) => !/\bsrc\s*=/.test(match[1]))
    .map((match) => match[2]);
  check(scripts.length === 1, `${file}: expected one inline script, got ${scripts.length}`);
  return { html, script: scripts[0] || '' };
}

class FakeElement {
  constructor(id = '') {
    this.id = id;
    this.dataset = {};
    this.style = {};
    this.hidden = false;
    this.disabled = false;
    this.value = '';
    this.checked = false;
    this.innerHTML = '';
    this.textContent = '';
    this.listeners = new Map();
    this.attributes = new Map();
    this.classNames = new Set();
    this.classList = {
      add: (...names) => names.forEach((name) => this.classNames.add(name)),
      remove: (...names) => names.forEach((name) => this.classNames.delete(name)),
      contains: (name) => this.classNames.has(name),
      toggle: (name, force) => {
        const enabled = force === undefined ? !this.classNames.has(name) : Boolean(force);
        if (enabled) this.classNames.add(name);
        else this.classNames.delete(name);
        return enabled;
      }
    };
  }

  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(listener);
  }

  removeEventListener() {}
  append() {}
  appendChild() {}
  remove() {}
  replaceWith() {}
  focus() {}
  click() {}
  closest() { return null; }
  matches() { return false; }
  querySelector() { return null; }
  querySelectorAll() { return []; }
  getContext() { return null; }
  getBoundingClientRect() { return { left: 0, top: 0, width: 1280, height: 720 }; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) || null; }
}

function storageStub() {
  const values = new Map();
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    clear: () => values.clear()
  };
}

function domContext({ tierButtons = false, fetchImpl = null } = {}) {
  const nodes = new Map();
  const document = new FakeElement('document');
  document.getElementById = (id) => {
    if (!nodes.has(id)) nodes.set(id, new FakeElement(id));
    return nodes.get(id);
  };
  document.createElement = (tag) => new FakeElement(tag);
  document.documentElement = new FakeElement('html');
  document.body = new FakeElement('body');
  document.activeElement = null;
  document.visibilityState = 'visible';
  document.hidden = false;

  if (tierButtons) {
    const buttons = ['all', 'base', 'unique'].map((tier) => {
      const button = new FakeElement(`tier-${tier}`);
      button.dataset.tierFilter = tier;
      return button;
    });
    document.getElementById('tierFilter').querySelectorAll = (selector) => selector === '[data-tier-filter]' ? buttons : [];
    nodes.set('__tierButtons', buttons);
  }

  const errors = [];
  const context = {
    console: {
      log() {}, warn() {}, info() {}, debug() {},
      error: (...args) => errors.push(args.map(String).join(' '))
    },
    document,
    location: new URL('http://127.0.0.1:8765/index.html'),
    navigator: { clipboard: { writeText: async () => {} }, onLine: true },
    localStorage: storageStub(),
    sessionStorage: storageStub(),
    Element: FakeElement,
    HTMLElement: FakeElement,
    HTMLImageElement: class HTMLImageElement extends FakeElement {},
    HTMLVideoElement: class HTMLVideoElement extends FakeElement {},
    Image: class Image extends FakeElement { set src(value) { this._src = value; } get src() { return this._src || ''; } },
    URL,
    URLSearchParams,
    Blob,
    AbortController,
    TextEncoder,
    TextDecoder,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    queueMicrotask,
    requestAnimationFrame: (callback) => { callback(0); return 1; },
    cancelAnimationFrame() {},
    addEventListener() {},
    removeEventListener() {},
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    crypto: { randomUUID: () => '00000000-0000-4000-8000-000000000000' },
    CSS: { escape: (value) => String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&') },
    fetch: fetchImpl || (async () => { throw new Error('unexpected fetch'); })
  };
  context.window = context;
  context.self = context;
  context.globalThis = context;
  return { context: vm.createContext(context), nodes, errors };
}

function exportIndexScript(script) {
  const marker = '\n      initialize();\n    })();';
  const index = script.lastIndexOf(marker);
  check(index !== -1, 'index.html: initialize marker not found');
  if (index === -1) return script;
  const injected = `\n      globalThis.__qaIndex = {\n        BASE_VIDEO_THRESHOLD, FAMILY_ORDER, state, dom, normalizeProject, normalizeElement,\n        tierMatches, familyMatches, renderTierFilter, familyStatisticsMarkup, previewSourceList, previewImageMarkup,\n        familyMeta, prepareImport, catalogAssetUrl, previewFallbackUrl, rawAssetUrl,\n        renderComparison, comparisonCard, comparisonPairs, comparisonLevelPercent\n      };\n    })();`;
  return `${script.slice(0, index)}${injected}${script.slice(index + marker.length)}`;
}

function localAsset(image) {
  const clean = String(image || '').split(/[?#]/, 1)[0].replace(/^\/+/, '');
  return clean.startsWith('assets/') ? path.join(ROOT, clean) : '';
}

function inventorySampleAsset(sample) {
  const normalized = String(sample || '').replaceAll('\\', '/');
  if (normalized.startsWith('assets/')) return path.join(ROOT, normalized);
  const marker = '/katalog-elementov/assets/';
  const index = normalized.indexOf(marker);
  return index === -1 ? '' : path.join(ROOT, 'assets', normalized.slice(index + marker.length));
}

function validateData(catalog) {
  const ownerSnapshot = readJson('data.backup-20260813.json');
  check(Array.isArray(catalog.projects), 'data.json: projects is not an array');
  check(Array.isArray(catalog.elements), 'data.json: elements is not an array');
  check(catalog.projects.length === EXPECTED.projects, `data.json: expected ${EXPECTED.projects} projects, got ${catalog.projects.length}`);
  check(catalog.elements.length === EXPECTED.elements, `data.json: expected ${EXPECTED.elements} elements, got ${catalog.elements.length}`);
  check(new Set(catalog.projects.map((project) => String(project.id))).size === catalog.projects.length, 'data.json: duplicate project ids');
  check(new Set(catalog.elements.map((element) => String(element.id))).size === catalog.elements.length, 'data.json: duplicate element ids');

  const finalById = new Map(catalog.elements.map((element) => [String(element.id), element]));
  const protectedFields = ['name', 'description', 'opinion', 'application', 'technique', 'category', 'timecodes', 'repeatCount', 'createdAt', 'updatedAt'];
  check(ownerSnapshot.elements.every((element) => finalById.has(String(element.id))), 'owner snapshot cards were lost');
  for (const owner of ownerSnapshot.elements) {
    const final = finalById.get(String(owner.id));
    if (!final) continue;
    for (const field of protectedFields) {
      check(JSON.stringify(final[field]) === JSON.stringify(owner[field]), `${owner.id}: owner field changed: ${field}`);
    }
  }

  const projectIds = new Set(catalog.projects.map((project) => String(project.id)));
  const familyStats = new Map(FAMILY_ORDER.map((family) => [family, { elements: [], projects: new Set() }]));
  for (const element of catalog.elements) {
    check(projectIds.has(String(element.projectId)), `element ${element.id}: unknown projectId ${element.projectId}`);
    check(FAMILY_ORDER.includes(element.family), `element ${element.id}: invalid family ${element.family}`);
    check(Number.isInteger(element.freq_videos), `element ${element.id}: invalid freq_videos`);
    check(Number.isInteger(element.freq_total), `element ${element.id}: invalid freq_total`);
    check(element.tier === 'base' || element.tier === 'unique', `element ${element.id}: invalid tier ${element.tier}`);
    check(typeof element.image === 'string' && element.image.trim(), `element ${element.id}: empty image`);
    const stat = familyStats.get(element.family);
    if (stat) {
      stat.elements.push(element);
      stat.projects.add(String(element.projectId));
    }
  }

  for (const [family, stat] of familyStats) {
    check(stat.elements.length > 0, `${family}: family has no elements`);
    const expectedTier = stat.projects.size / catalog.projects.length >= 0.5 ? 'base' : 'unique';
    for (const element of stat.elements) {
      check(element.freq_videos === stat.projects.size, `${element.id}: freq_videos ${element.freq_videos}, expected ${stat.projects.size}`);
      check(element.freq_total === stat.elements.length, `${element.id}: freq_total ${element.freq_total}, expected ${stat.elements.length}`);
      check(element.tier === expectedTier, `${element.id}: tier ${element.tier}, expected ${expectedTier}`);
      check(element.freq_videos !== 1 || element.tier === 'unique', `${element.id}: freq_videos=1 must be unique`);
    }
  }

  const base = catalog.elements.filter((element) => element.tier === 'base').length;
  const unique = catalog.elements.filter((element) => element.tier === 'unique').length;
  check(base === EXPECTED.base, `base count ${base}, expected ${EXPECTED.base}`);
  check(unique === EXPECTED.unique, `unique count ${unique}, expected ${EXPECTED.unique}`);
  check(familyStats.size === EXPECTED.families, `family count ${familyStats.size}, expected ${EXPECTED.families}`);

  const broken = [];
  for (const element of catalog.elements) {
    const asset = localAsset(element.image);
    if (!asset || !fs.existsSync(asset)) broken.push(`${element.id}: ${element.image}`);
  }
  check(broken.length === 0, `broken image paths: ${broken.slice(0, 5).join(', ')}`);

  const importedProject = catalog.projects.find((project) => /(?:v=|youtu\.be\/|\/)(4yavUTCeCp0)(?:[?&#/]|$)/.test(String(project.url)));
  check(Boolean(importedProject), '4yavUTCeCp0 project not found');
  const imported = importedProject ? catalog.elements.filter((element) => String(element.projectId) === String(importedProject.id)) : [];
  check(imported.length === EXPECTED.imported, `4yavUTCeCp0 count ${imported.length}, expected ${EXPECTED.imported}`);
  for (const element of imported) {
    const asset = localAsset(element.image);
    check(Boolean(asset && fs.existsSync(asset)), `4yavUTCeCp0 ${element.id}: image missing`);
    if (asset && fs.existsSync(asset)) check(fs.statSync(asset).size > 5 * 1024, `4yavUTCeCp0 ${element.id}: image <=5 KiB`);
  }
  return { familyStats, base, unique, imported };
}

function validateIndex(catalog, indexPage, dataSummary) {
  new vm.Script(indexPage.script, { filename: 'index.html' });
  const { context, nodes, errors } = domContext({ tierButtons: true });
  new vm.Script(exportIndexScript(indexPage.script), { filename: 'index.html#mini-dom' }).runInContext(context);
  const qa = context.__qaIndex || context.globalThis?.__qaIndex;
  check(Boolean(qa), 'index.html: QA exports unavailable');
  if (!qa) return;

  qa.state.projects = catalog.projects.map((project) => qa.normalizeProject(project));
  qa.state.elements = catalog.elements.map((element) => qa.normalizeElement(element));
  qa.state.categories = catalog.categories;
  check(qa.BASE_VIDEO_THRESHOLD === 0.5, `base threshold ${qa.BASE_VIDEO_THRESHOLD}, expected 0.5`);
  check(Array.from(qa.FAMILY_ORDER).join('|') === FAMILY_ORDER.join('|'), 'index family order differs from data QA order');

  const normalizedNull = qa.normalizeElement({ id: 'null-test', image: null, family: null, freq_videos: null, freq_total: null, tier: null });
  check(normalizedNull.image === '', 'normalizeElement does not tolerate image=null');
  check(normalizedNull.family === 'OTHER', 'normalizeElement invalid family fallback failed');
  check(normalizedNull.freq_videos === 0 && normalizedNull.freq_total === 0, 'normalizeElement null frequency fallback failed');
  check(normalizedNull.tier === 'unique', 'normalizeElement null tier fallback failed');

  for (const [tier, expected] of [['all', EXPECTED.elements], ['base', EXPECTED.base], ['unique', EXPECTED.unique]]) {
    qa.state.tierFilter = tier;
    const actual = qa.state.elements.filter((element) => qa.tierMatches(element)).length;
    check(actual === expected, `tier filter ${tier}: ${actual}, expected ${expected}`);
    qa.renderTierFilter();
    const buttons = nodes.get('__tierButtons');
    for (const button of buttons) {
      const active = button.dataset.tierFilter === tier;
      check(button.classList.contains('is-active') === active, `tier button ${button.dataset.tierFilter}: class mismatch for ${tier}`);
      check(button.getAttribute('aria-pressed') === String(active), `tier button ${button.dataset.tierFilter}: aria mismatch for ${tier}`);
    }
  }

  const statistics = qa.familyStatisticsMarkup();
  check(statistics.includes(`<div class="kpi-value">${EXPECTED.base}</div><div class="kpi-label">База</div>`), 'stats panel base KPI mismatch');
  check(statistics.includes(`<div class="kpi-value">${EXPECTED.unique}</div><div class="kpi-label">Уникальные</div>`), 'stats panel unique KPI mismatch');
  check(statistics.includes(`<div class="kpi-value">${EXPECTED.families}</div><div class="kpi-label">Семейств</div>`), 'stats panel family KPI mismatch');
  check(statistics.includes(`<div class="kpi-value">${EXPECTED.projects}</div><div class="kpi-label">Видео</div>`), 'stats panel project KPI mismatch');
  check((statistics.match(/class="stat-entry"/g) || []).length === EXPECTED.families, 'stats panel does not render 18 family rows');
  for (const [family, stat] of dataSummary.familyStats) {
    const base = stat.elements.filter((element) => element.tier === 'base').length;
    const unique = stat.elements.length - base;
    check(statistics.includes(`${family}</span><span class="stat-entry-value">${stat.projects.size}/${EXPECTED.projects} видео · база ${base} · уник. ${unique}`), `stats panel mismatch for ${family}`);
  }

  const queryElements = qa.state.elements.filter((element) => element.image.includes('?'));
  check(queryElements.length > 0, 'no versioned image paths available for query-tail test');
  for (const element of qa.state.elements) {
    const sources = qa.previewSourceList(element);
    check(sources.length > 0, `${element.id}: previewSourceList returned no source`);
    check(qa.previewImageMarkup(element).includes('<img '), `${element.id}: previewImageMarkup did not render image`);
    check(qa.familyMeta(element).includes(`в ${element.freq_videos} из ${EXPECTED.projects} видео · ${element.freq_total} карточек`), `${element.id}: family metadata mismatch`);
  }
  for (const element of queryElements) {
    const sources = qa.previewSourceList(element);
    check(sources[0].includes('?'), `${element.id}: first preview source lost query tail`);
    check(sources.some((source) => !source.includes('?')), `${element.id}: versionless preview fallback absent`);
  }
  for (const element of dataSummary.imported) {
    check(qa.previewImageMarkup(element).includes('<img '), `4yavUTCeCp0 ${element.id}: screenshot not rendered`);
  }

  const imported = qa.prepareImport(catalog);
  check(imported.projects.length === catalog.projects.length && imported.elements.length === catalog.elements.length, 'catalog import changes record counts');
  check(imported.elements.every((element) => FAMILY_ORDER.includes(element.family)), 'catalog import loses family');
  check(imported.elements.every((element) => Number.isInteger(element.freq_videos) && Number.isInteger(element.freq_total)), 'catalog import loses frequency fields');
  check(imported.elements.every((element) => element.tier === 'base' || element.tier === 'unique'), 'catalog import loses tier');
  check(imported.elements.every((element) => typeof element.image === 'string'), 'catalog import does not normalize image');
  check(errors.length === 0, `index.html mini-DOM console errors: ${errors.join(' | ')}`);
}

function validateComparison(comparison, oursTech, indexPage) {
  const { context, nodes, errors } = domContext({ tierButtons: true });
  context.SRAVNENIE = comparison;
  new vm.Script(exportIndexScript(indexPage.script), { filename: 'index.html#comparison-mini-dom' }).runInContext(context);
  const qa = context.__qaIndex || context.globalThis?.__qaIndex;
  check(Boolean(qa), 'comparison QA exports unavailable');
  if (!qa) return;
  qa.state.view = 'comparison';
  qa.state.search = '';
  qa.state.familyFilter = 'all';
  qa.state.oursTech = oursTech;
  qa.renderComparison();

  const html = nodes.get('workspaceInner').innerHTML;
  check(errors.length === 0, `comparison mini-DOM console errors: ${errors.join(' | ')}`);
  check(indexPage.html.includes('.abilities-grid { display: grid;') && !indexPage.html.includes('.abilities-grid { columns:'), 'ability layout is not CSS Grid');
  check((html.match(/class="capability-family"/g) || []).length === COMPARISON_EXPECTED.families, 'integrated comparison did not render 16 collapsed family rows');
  check((html.match(/class="ability-family-summary"/g) || []).length === COMPARISON_EXPECTED.families, 'integrated comparison family summary count mismatch');
  check((html.match(/class="comparison-card"/g) || []).length === 0, 'collapsed comparison rendered family cards');
  check((html.match(/class="ability-card"/g) || []).length === 0, 'collapsed comparison rendered ability cards');
  check(html.includes('Умеем 1:1 · 3') && html.includes('Частично · 1') && html.includes('Не умеем · 0') && html.includes('75% 1:1'), 'family summary counters or percentage mismatch');
  check(html.includes(`${COMPARISON_EXPECTED.abilities}/${COMPARISON_EXPECTED.abilities} умений`), 'integrated comparison count mismatch');
  check(html.includes('data-ability-stat="total">167') && html.includes('data-ability-stat="exact">121') && html.includes('data-ability-stat="partial">46') && html.includes('data-ability-stat="unavailable">0'), 'integrated ability statistics mismatch');
  check(html.includes('видеосравнение сверху') && html.includes('умения и техпаспорта ниже'), 'comparison intro does not describe the new layout');

  comparison.families.forEach((record) => qa.state.expandedAbilityFamilies.add(record.family));
  qa.renderComparison();
  const expandedHtml = nodes.get('workspaceInner').innerHTML;
  const pairCounts = [...expandedHtml.matchAll(/data-pair-count="(\d+)"/g)].map((match) => Number(match[1]));
  const ourSources = [...expandedHtml.matchAll(/class="comparison-media"><video src="([^"]+)"/g)].map((match) => match[1]);
  const competitorSources = [...expandedHtml.matchAll(/class="competitor-carousel"><video src="([^"]+)"/g)].map((match) => match[1]);
  check((expandedHtml.match(/class="comparison-card"/g) || []).length === COMPARISON_EXPECTED.cards, 'expanded comparison did not render 16 complete active pair cards');
  check(ourSources.length === COMPARISON_EXPECTED.cards && ourSources.every((source) => /^assets\/ours\/pairs\/.+-ours\.mp4$/.test(source)), 'expanded comparison local videos are not pair-specific MP4 files');
  check(competitorSources.length === COMPARISON_EXPECTED.cards && competitorSources.every((source) => /^assets\/clips\/.+\.mp4$/.test(source)), 'expanded comparison competitor videos are not pair-specific MP4 files');
  check(pairCounts.length === COMPARISON_EXPECTED.families && pairCounts.reduce((total, count) => total + count, 0) === COMPARISON_EXPECTED.pairs, 'rendered family pair counts do not total 42');
  check((expandedHtml.match(/class="competitor-variant"/g) || []).length === COMPARISON_EXPECTED.cards, 'pair variant caption count mismatch');
  check((expandedHtml.match(/data-comparison-prev=/g) || []).length === COMPARISON_EXPECTED.cards && (expandedHtml.match(/data-comparison-next=/g) || []).length === COMPARISON_EXPECTED.cards, 'pair carousel controls mismatch');
  check((expandedHtml.match(/data-lightbox-pair=/g) || []).length === COMPARISON_EXPECTED.cards, 'expanded comparison did not render 16 side-by-side buttons');
  check(!/<img\b/i.test(expandedHtml) && !/\.(?:jpe?g|png|webp)(?:[?#"]|$)/i.test(expandedHtml), 'static media leaked into the primary comparison output');
  check(!/assets\/ours\/(?!pairs\/)/.test(expandedHtml), 'legacy local samples leaked into the comparison DOM');
  check(FORBIDDEN_COMPARISON_TEXT.every((text) => !expandedHtml.includes(text)), 'placeholder, debug, or service text leaked into the comparison DOM');
  const techPassportCount = (expandedHtml.match(/class="tech-passport(?: |")/g) || []).length;
  check(techPassportCount === COMPARISON_EXPECTED.abilities, `integrated comparison tech passport count ${techPassportCount}, expected ${COMPARISON_EXPECTED.abilities}`);
  check((expandedHtml.match(/class="ability-card(?: |")/g) || []).length === COMPARISON_EXPECTED.abilities, 'expanded comparison did not render 167 abilities');
  check((expandedHtml.match(/class="abilities-group"/g) || []).length === COMPARISON_EXPECTED.families, 'expanded comparison did not render 16 ability groups');
  check((expandedHtml.match(/data-ability-status="умеем 1:1"/g) || []).length === COMPARISON_EXPECTED.exact, 'expanded comparison exact status count mismatch');
  check((expandedHtml.match(/data-ability-status="умеем частично"/g) || []).length === COMPARISON_EXPECTED.partial, 'expanded comparison partial status count mismatch');
  check((expandedHtml.match(/data-ability-status="не умеем"/g) || []).length === COMPARISON_EXPECTED.unavailable, 'expanded comparison unavailable status count mismatch');
  const abilityCards = [...expandedHtml.matchAll(/<article class="ability-card(?: [^"]*)?"[\s\S]*?<\/article>/g)].map((match) => match[0]);
  check(abilityCards.length === COMPARISON_EXPECTED.abilities && abilityCards.every((card) => !/<(?:img|video)\b/.test(card)), `ability rows contain inline media or count ${abilityCards.length}, expected ${COMPARISON_EXPECTED.abilities}`);
  check(abilityCards.every((card) => card.includes('<summary><span>Техпаспорт</span>')), 'ability rows are missing the Tech Passport disclosure');
  const sampleSources = [...expandedHtml.matchAll(/class="ability-sample-button"[^>]*data-lightbox-source="([^"]+)"/g)].map((match) => match[1]);
  check(sampleSources.length === COMPARISON_EXPECTED.sampleButtons, `ability sample button count ${sampleSources.length}, expected ${COMPARISON_EXPECTED.sampleButtons}`);
  check(['PHOTO-IMAGE', 'TEXT-TYPOGRAPHY', 'GEOMETRY-SHAPE'].every((family) => expandedHtml.includes(`data-comparison-family="${family}"`)), 'formerly static families are missing complete comparison cards');

  qa.state.expandedAbilityFamilies.clear();
  qa.state.expandedAbilityFamilies.add(comparison.families[0].family);
  qa.state.familyFilter = comparison.families[0].family;
  qa.renderComparison();
  check((nodes.get('workspaceInner').innerHTML.match(/class="comparison-card"/g) || []).length === 1, 'comparison family filter mismatch');
  check((nodes.get('workspaceInner').innerHTML.match(/class="ability-card(?: |")/g) || []).length === 4, 'comparison family ability count mismatch');
  check((nodes.get('workspaceInner').innerHTML.match(/class="competitor-carousel"><video/g) || []).length === 1, 'filtered family renders more than one competitor clip');

  qa.state.familyFilter = 'all';
  qa.state.search = 'Whisper word timestamps';
  qa.renderComparison();
  check((nodes.get('workspaceInner').innerHTML.match(/class="comparison-card"/g) || []).length === 1, 'comparison ability search family mismatch');
  check((nodes.get('workspaceInner').innerHTML.match(/class="ability-card(?: |")/g) || []).length === 1, 'comparison ability search result mismatch');
}

async function main() {
  const catalog = readJson('data.json');
  const comparison = readJson('sravnenie.json');
  const comparisonDataContext = { window: {} };
  new vm.Script(fs.readFileSync(path.join(ROOT, 'sravnenie-data.js'), 'utf8'), { filename: 'sravnenie-data.js' }).runInNewContext(comparisonDataContext);
  const oursTech = readJson('ours_tech_full.json');
  const indexPage = inlineScript('index.html');
  const dataSummary = validateData(catalog);
  validateIndex(catalog, indexPage, dataSummary);
  check(Array.isArray(comparison.families), 'sravnenie.json: families is not an array');
  check(comparison.families.length === COMPARISON_EXPECTED.families, `sravnenie.json: expected 16 families, got ${comparison.families.length}`);
  check(new Set(comparison.families.map((record) => record.family)).size === COMPARISON_EXPECTED.families, 'sravnenie.json: duplicate family records');
  check(comparison.families.map((record) => record.family).join('|') === COMPARISON_FAMILY_ORDER.join('|'), 'sravnenie.json: comparison family set or order mismatch');
  check(comparison.version === 4, `sravnenie.json: expected version 4, got ${comparison.version}`);
  check(JSON.stringify(comparisonDataContext.window.SRAVNENIE) === JSON.stringify(comparison), 'sravnenie-data.js differs from sravnenie.json');
  const allPairs = comparison.families.flatMap((record) => record.pairs || []);
  check(allPairs.length === COMPARISON_EXPECTED.pairs, `sravnenie.json: expected 42 pairs, got ${allPairs.length}`);
  check(comparison.families.every((record) => Array.isArray(record.pairs) && record.pairs.length === VIDEO_COMPARISON[record.family]), 'sravnenie.json: family pair count mismatch');
  check(comparison.families.every((record) => !['our_media', 'our_poster', 'competitor_clips', 'competitor_refs', 'competitor_frames'].some((field) => field in record)), 'sravnenie.json: legacy family media fields remain');
  for (const record of comparison.families) {
    const ourSamples = record.pairs.filter((pair) => /^assets\/ours\/pairs\/.+-ours\.mp4$/.test(pair.our_media || ''));
    const competitorClips = record.pairs.filter((pair) => /^assets\/clips\/.+\.mp4$/.test(pair.competitor_media || ''));
    check(ourSamples.length === competitorClips.length && ourSamples.length === VIDEO_COMPARISON[record.family], `${record.family}: our sample and competitor clip counts differ`);
    check(record.pairs.every((pair) => typeof pair.variant === 'string' && pair.variant.trim()), `${record.family}: empty pair caption`);
    check(record.pairs.every((pair) => path.basename(pair.our_media, '.mp4') === `${path.basename(pair.competitor_media, '.mp4')}-ours`), `${record.family}: pair filename mismatch`);
  }
  const ourSources = allPairs.map((pair) => pair.our_media);
  const competitorSources = allPairs.map((pair) => pair.competitor_media);
  check(new Set(ourSources).size === COMPARISON_EXPECTED.pairs, 'sravnenie.json: duplicate our pair sample');
  check(new Set(competitorSources).size === COMPARISON_EXPECTED.pairs, 'sravnenie.json: duplicate competitor pair clip');
  check([...ourSources, ...competitorSources].every((source) => /\.mp4$/.test(source) && !/\.(?:jpe?g|png|webp)$/i.test(source)), 'sravnenie.json: non-video primary pair media remains');
  const pairAssets = fs.readdirSync(path.join(ROOT, 'assets', 'ours', 'pairs')).filter((name) => name.endsWith('.mp4')).map((name) => `assets/ours/pairs/${name}`).sort();
  check(pairAssets.length === COMPARISON_EXPECTED.pairs && pairAssets.join('|') === [...ourSources].sort().join('|'), 'assets/ours/pairs: files and comparison references differ');
  check(Object.keys(oursTech).length === EXPECTED.abilities, `ours_tech_full.json: expected 216 abilities, got ${Object.keys(oursTech).length}`);
  check(Object.values(oursTech).every((record) => ['умеем 1:1', 'умеем частично', 'не умеем'].includes(record.status)), 'ours_tech_full.json: invalid status');
  check(Object.values(oursTech).every((record) => ['status', 'tech_path', 'tool', 'how_to', 'sample', 'matches_competitor_family'].every((field) => typeof record[field] === 'string')), 'ours_tech_full.json: invalid field type');
  check(Object.values(oursTech).every((record) => FAMILY_ORDER.includes(record.matches_competitor_family)), 'ours_tech_full.json: invalid competitor family');
  check(Object.values(oursTech).filter((record) => record.status === 'умеем 1:1').length === EXPECTED.exact, 'ours_tech_full.json: expected 154 exact abilities');
  check(Object.values(oursTech).filter((record) => record.status === 'умеем частично').length === EXPECTED.partial, 'ours_tech_full.json: expected 60 partial abilities');
  check(Object.values(oursTech).filter((record) => record.status === 'не умеем').length === EXPECTED.unavailable, 'ours_tech_full.json: expected 2 unavailable abilities');
  const repoSamples = Object.entries(oursTech).filter(([, record]) => inventorySampleAsset(record.sample));
  check(repoSamples.length === EXPECTED.repoSamples, `ours_tech_full.json: expected 32 repo samples, got ${repoSamples.length}`);
  for (const [name, record] of repoSamples) {
    check(fs.existsSync(inventorySampleAsset(record.sample)), `${name}: sample missing`);
  }
  for (const record of comparison.families) for (const pair of record.pairs) {
    check(fs.existsSync(localAsset(pair.our_media)), `${record.family}: our pair sample missing: ${pair.our_media}`);
    check(fs.existsSync(localAsset(pair.competitor_media)), `${record.family}: competitor pair clip missing: ${pair.competitor_media}`);
  }
  validateComparison(comparison, oursTech, indexPage);

  if (failures.length) {
    console.error(`FAIL ${failures.length}/${assertions}`);
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exitCode = 1;
    return;
  }
  console.log(`PASS ${assertions} assertions; projects=${catalog.projects.length}; elements=${catalog.elements.length}; base=${dataSummary.base}; unique=${dataSummary.unique}; families=${dataSummary.familyStats.size}; imported=${dataSummary.imported.length}`);
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
