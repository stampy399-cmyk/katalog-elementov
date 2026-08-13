#!/usr/bin/env node

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const root = path.resolve(__dirname, '..');
const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const httpUrl = process.argv[2] || 'http://127.0.0.1:8765/index.html';
const fileUrl = `file://${encodeURI(path.join(root, 'index.html'))}`;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'katalog-browser-'));
const failures = [];
const surfaces = [];
let assertions = 0;

function check(condition, message) {
  assertions += 1;
  if (!condition) failures.push(message);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function removeTemporaryProfile() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      fs.rmSync(profile, { recursive: true, force: true });
      return;
    } catch (error) {
      if (!['ENOTEMPTY', 'EBUSY'].includes(error.code) || attempt === 7) throw error;
      await delay(250);
    }
  }
}

function launchChrome() {
  return new Promise((resolve, reject) => {
    const child = spawn(chromePath, [
      '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
      '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
      '--disable-component-update', '--disable-sync', '--disable-gpu',
      '--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required', 'about:blank'
    ], { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    const timer = setTimeout(() => reject(new Error(`Chrome DevTools timeout: ${stderr}`)), 15000);
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (!match) return;
      clearTimeout(timer);
      resolve({ child, websocketUrl: match[1] });
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      if (!/DevTools listening/.test(stderr)) reject(new Error(`Chrome exited ${code}: ${stderr}`));
    });
  });
}

class Cdp {
  constructor(url) {
    this.url = url;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Set();
  }

  async connect() {
    this.socket = new WebSocket(this.url);
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(`${message.error.message}: ${JSON.stringify(message.error.data || '')}`));
        else pending.resolve(message.result || {});
        return;
      }
      for (const listener of this.listeners) listener(message);
    });
    await new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
  }

  send(method, params = {}, sessionId) {
    const id = this.nextId++;
    const message = { id, method, params };
    if (sessionId) message.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify(message));
    });
  }

  on(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

async function createPage(cdp) {
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  await Promise.all([
    cdp.send('Page.enable', {}, sessionId),
    cdp.send('Runtime.enable', {}, sessionId),
    cdp.send('Log.enable', {}, sessionId),
    cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false }, sessionId)
  ]);
  return { targetId, sessionId };
}

async function evaluate(cdp, sessionId, expression) {
  const response = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true
  }, sessionId);
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text || 'Runtime evaluation failed');
  return response.result?.value;
}

async function waitFor(cdp, sessionId, expression, timeout = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try {
      if (await evaluate(cdp, sessionId, expression)) return;
    } catch (error) {
      if (!/navigated|execution context|Cannot find context|Target closed/i.test(error.message)) throw error;
    }
    await delay(200);
  }
  throw new Error(`waitFor timeout: ${expression}`);
}

async function navigate(cdp, page, url, label) {
  const errors = [];
  const remove = cdp.on((message) => {
    if (message.sessionId !== page.sessionId) return;
    if (message.method === 'Runtime.exceptionThrown') {
      errors.push(message.params.exceptionDetails?.exception?.description || message.params.exceptionDetails?.text || 'Runtime exception');
    }
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
      errors.push(message.params.args.map((arg) => arg.value || arg.description || '').join(' '));
    }
    if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') {
      const entry = message.params.entry;
      const cancelledLocalAsset = /net::ERR_(?:CONNECTION_RESET|SOCKET_NOT_CONNECTED)/.test(entry.text)
        && /^http:\/\/127\.0\.0\.1:\d+\/assets\//.test(entry.url || '');
      if (!cancelledLocalAsset) errors.push(`${entry.text}${entry.url ? ` @ ${entry.url}` : ''}`);
    }
  });
  await cdp.send('Page.navigate', { url }, page.sessionId);
  await waitFor(cdp, page.sessionId, `document.readyState === 'complete' && document.querySelectorAll('#videoList .video-row').length === 9 && document.getElementById('saveState')?.textContent === 'Сохранено'`, 45000);
  await delay(500);
  surfaces.push({ label, errors });
  return remove;
}

const idbCountExpression = `(async()=>{
  const db=await new Promise((resolve,reject)=>{const request=indexedDB.open('local-element-catalog',7);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});
  const values=await new Promise((resolve,reject)=>{const request=db.transaction('elements').objectStore('elements').getAll();request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});
  db.close();
  return {count:values.length,families:values.filter(item=>item.family&&Number.isInteger(item.freq_videos)&&Number.isInteger(item.freq_total)&&(item.tier==='base'||item.tier==='unique')).length,marker:values.filter(item=>item.description==='QA_LOCAL_EDIT').length,added:values.filter(item=>item.id==='QA_SERVER_ADD').length};
})()`;

async function validateCatalog(cdp, page, label) {
  await waitFor(cdp, page.sessionId, `[...document.images].filter(image=>{const box=image.getBoundingClientRect();return box.bottom>=0&&box.top<=innerHeight}).every(image=>image.complete)`, 45000);
  const summary = await evaluate(cdp, page.sessionId, `({
    title:document.title,
    nav:[...document.querySelectorAll('#viewSwitch [data-view]')].map(button=>({text:button.textContent.trim(),height:button.getBoundingClientRect().height,fontSize:parseFloat(getComputedStyle(button).fontSize),fontWeight:parseInt(getComputedStyle(button).fontWeight),active:button.classList.contains('is-active')})),
    videos:document.querySelectorAll('#videoList .video-row').length,
    videoCounter:document.getElementById('videoListCount').textContent,
    cards:document.querySelectorAll('.element-card').length,
    badges:document.querySelectorAll('.element-family-meta').length,
    familyOptions:document.getElementById('familyFilter').options.length,
    total:PUBLISHED_CATALOG.elements.length,
    projects:PUBLISHED_CATALOG.projects.length,
    selfTest:globalThis.__catalogSelfTest()
  })`);
  check(summary.title === 'РУЧНОЙ каталог отбора', `${label}: title mismatch`);
  check(summary.nav.length === 2 && summary.nav.map(item=>item.text).join('|') === 'КАТАЛОГ КОНКУРЕНТОВ|МЫ УМЕЕМ', `${label}: primary navigation labels mismatch`);
  check(summary.nav.every(item=>item.height >= 55 && item.fontSize >= 20 && item.fontWeight >= 700), `${label}: primary navigation is not large and bold`);
  check(summary.nav[0].active && !summary.nav[1].active, `${label}: catalog navigation active state mismatch`);
  check(summary.videos === 9 && summary.videoCounter === '9/9', `${label}: video list mismatch`);
  check(summary.cards > 0 && summary.badges === summary.cards, `${label}: card badges mismatch`);
  check(summary.familyOptions === 19, `${label}: family filter options mismatch`);
  check(summary.total === 2852 && summary.projects === 9, `${label}: catalog counters mismatch`);
  check(summary.selfTest.failures.length === 0, `${label}: self-test failures: ${summary.selfTest.failures.join(', ')}`);

  await evaluate(cdp, page.sessionId, `document.querySelector('[data-view="comparison"]').click()`);
  await waitFor(cdp, page.sessionId, `document.querySelectorAll('.comparison-card').length === 18`);
  await waitFor(cdp, page.sessionId, `[...document.images].filter(image=>{const box=image.getBoundingClientRect();return box.bottom>=0&&box.top<=innerHeight}).every(image=>image.complete)`, 45000);
  const comparison = await evaluate(cdp, page.sessionId, `({cards:document.querySelectorAll('.comparison-card').length,videos:document.querySelectorAll('.comparison-media video').length,refs:document.querySelectorAll('.competitor-card').length,refMinWidth:Math.min(...[...document.querySelectorAll('.competitor-card')].map(card=>card.getBoundingClientRect().width)),tech:document.querySelectorAll('.tech-passport').length,todo:document.querySelectorAll('.tech-field.is-todo').length,media:document.querySelectorAll('[data-lightbox-media]').length,pairs:document.querySelectorAll('[data-lightbox-pair]').length,hash:location.hash,navActive:document.querySelector('#viewSwitch [data-view="comparison"]')?.classList.contains('is-active')})`);
  check(comparison.cards === 18 && comparison.videos === 13 && comparison.refs === 52, `${label}: comparison counters mismatch`);
  check(comparison.refMinWidth >= 300, `${label}: competitor reference width ${comparison.refMinWidth}px, expected >=300px`);
  check(comparison.tech === 18 && comparison.todo > 0, `${label}: tech passports or TODO fields missing`);
  check(comparison.media === 69 && comparison.pairs === 17, `${label}: lightbox media/pair controls mismatch`);
  check(comparison.hash === '#comparison', `${label}: comparison hash mismatch`);
  check(comparison.navActive, `${label}: comparison navigation active state mismatch`);

  await evaluate(cdp, page.sessionId, `document.querySelector('.competitor-card img').click()`);
  await waitFor(cdp, page.sessionId, `document.querySelector('#lightbox.is-open .lightbox-media')`);
  check(await evaluate(cdp, page.sessionId, `document.querySelector('#lightbox.is-open .lightbox-media')?.tagName === 'IMG'`), `${label}: image lightbox did not open`);
  await evaluate(cdp, page.sessionId, `document.getElementById('lightboxContent').click()`);
  await waitFor(cdp, page.sessionId, `!document.getElementById('lightbox').classList.contains('is-open')`);

  await evaluate(cdp, page.sessionId, `document.querySelector('.comparison-media video').click()`);
  await waitFor(cdp, page.sessionId, `document.querySelector('#lightbox.is-open video[controls]')`);
  check(await evaluate(cdp, page.sessionId, `document.querySelector('#lightbox.is-open video')?.controls === true`), `${label}: video lightbox controls missing`);
  await evaluate(cdp, page.sessionId, `document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);
  await waitFor(cdp, page.sessionId, `!document.getElementById('lightbox').classList.contains('is-open')`);

  await evaluate(cdp, page.sessionId, `document.querySelector('[data-lightbox-pair]').click()`);
  await waitFor(cdp, page.sessionId, `document.querySelector('#lightbox.is-open .lightbox-pair')`);
  const pairStart = await evaluate(cdp, page.sessionId, `({media:document.querySelectorAll('.lightbox-pair .lightbox-media').length,counter:document.getElementById('lightboxCounter').textContent,ref:document.querySelector('.lightbox-pane:last-child img')?.src})`);
  check(pairStart.media === 2 && pairStart.counter === '1 / 3', `${label}: side-by-side lightbox mismatch`);
  await evaluate(cdp, page.sessionId, `document.querySelector('[data-lightbox-next]').click()`);
  await waitFor(cdp, page.sessionId, `document.getElementById('lightboxCounter').textContent === '2 / 3'`);
  const pairNext = await evaluate(cdp, page.sessionId, `({counter:document.getElementById('lightboxCounter').textContent,ref:document.querySelector('.lightbox-pane:last-child img')?.src})`);
  check(pairNext.counter === '2 / 3' && pairNext.ref !== pairStart.ref, `${label}: side-by-side next button mismatch`);
  await evaluate(cdp, page.sessionId, `document.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}))`);
  await waitFor(cdp, page.sessionId, `document.getElementById('lightboxCounter').textContent === '3 / 3'`);
  if (label === 'HTTP') {
    const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, page.sessionId);
    fs.writeFileSync('/tmp/katalog-lightbox-pair-qa.png', Buffer.from(screenshot.data, 'base64'));
  }
  await evaluate(cdp, page.sessionId, `document.getElementById('lightbox').click()`);
  await waitFor(cdp, page.sessionId, `!document.getElementById('lightbox').classList.contains('is-open')`);

  if (label === 'HTTP') {
    const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, page.sessionId);
    fs.writeFileSync('/tmp/katalog-comparison-qa.png', Buffer.from(screenshot.data, 'base64'));
  }

  await evaluate(cdp, page.sessionId, `(()=>{const select=document.getElementById('familyFilter');select.value='KEYFRAMES-MOTION';select.dispatchEvent(new Event('change',{bubbles:true}))})()`);
  await waitFor(cdp, page.sessionId, `document.querySelectorAll('.comparison-card').length === 1`);
  check(await evaluate(cdp, page.sessionId, `document.querySelector('.comparison-family')?.textContent === 'KEYFRAMES-MOTION'`), `${label}: comparison family filter mismatch`);

  await evaluate(cdp, page.sessionId, `(()=>{const select=document.getElementById('familyFilter');select.value='all';select.dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('[data-view="catalog"]').click()})()`);
  await waitFor(cdp, page.sessionId, `document.querySelectorAll('.element-card').length > 0 && !document.querySelector('.comparison-page')`);
  await waitFor(cdp, page.sessionId, `[...document.images].filter(image=>{const box=image.getBoundingClientRect();return box.bottom>=0&&box.top<=innerHeight}).every(image=>image.complete)`, 45000);
}

async function validateHttpRefresh(cdp, page) {
  const before = await evaluate(cdp, page.sessionId, idbCountExpression);
  check(before.count === 2852 && before.families === 2852, 'HTTP: initial IndexedDB fields mismatch');

  await evaluate(cdp, page.sessionId, `document.querySelector('.element-card').click()`);
  await waitFor(cdp, page.sessionId, `document.querySelector('.element-card.is-expanded textarea[data-element-field="description"]')`);
  await waitFor(cdp, page.sessionId, `[...document.images].filter(image=>{const box=image.getBoundingClientRect();return box.bottom>=0&&box.top<=innerHeight}).every(image=>image.complete)`, 45000);
  await evaluate(cdp, page.sessionId, `(()=>{const textarea=document.querySelector('.element-card.is-expanded textarea[data-element-field="description"]');textarea.value='QA_LOCAL_EDIT';textarea.dispatchEvent(new Event('input',{bubbles:true}));textarea.blur()})()`);
  await waitFor(cdp, page.sessionId, `document.getElementById('saveState').textContent === 'Сохранено'`);
  await delay(500);

  await cdp.send('Page.reload', { ignoreCache: true }, page.sessionId);
  await waitFor(cdp, page.sessionId, `document.readyState === 'complete' && document.querySelectorAll('#videoList .video-row').length === 9 && document.getElementById('saveState')?.textContent === 'Сохранено'`, 45000);
  const persisted = await evaluate(cdp, page.sessionId, idbCountExpression);
  check(persisted.marker === 1, 'HTTP: UI edit was not persisted in IndexedDB');

  await evaluate(cdp, page.sessionId, `(async()=>{
    const db=await new Promise((resolve,reject)=>{const request=indexedDB.open('local-element-catalog',7);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});
    const values=await new Promise((resolve,reject)=>{const request=db.transaction('elements').objectStore('elements').getAll();request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});
    const target=values.find(item=>item.description!=='QA_LOCAL_EDIT');
    await new Promise((resolve,reject)=>{const transaction=db.transaction('elements','readwrite');transaction.objectStore('elements').delete(target.id);transaction.oncomplete=resolve;transaction.onerror=()=>reject(transaction.error)});
    db.close();
    return target.id;
  })()`);
  await cdp.send('Page.reload', { ignoreCache: true }, page.sessionId);
  await waitFor(cdp, page.sessionId, `document.readyState === 'complete' && document.querySelectorAll('#videoList .video-row').length === 9 && document.getElementById('saveState')?.textContent === 'Сохранено'`, 45000);
  const afterDeletion = await evaluate(cdp, page.sessionId, idbCountExpression);
  check(afterDeletion.count === 2851 && afterDeletion.marker === 1, 'HTTP: local deletion did not survive reload');

  await delay(1500);
  const mockCatalog = JSON.parse(fs.readFileSync(path.join(root, 'data.json'), 'utf8'));
  mockCatalog.exportedAt = '2026-08-13T12:00:00Z';
  mockCatalog.elements.push({
    ...mockCatalog.elements[0], id: 'QA_SERVER_ADD', name: 'QA server addition', description: 'QA server addition'
  });
  const mockBody = Buffer.from(JSON.stringify(mockCatalog)).toString('base64');
  const removeMock = cdp.on((message) => {
    if (message.sessionId !== page.sessionId || message.method !== 'Fetch.requestPaused') return;
    cdp.send('Fetch.fulfillRequest', {
      requestId: message.params.requestId,
      responseCode: 200,
      responseHeaders: [{ name: 'Content-Type', value: 'application/json; charset=utf-8' }],
      body: mockBody
    }, page.sessionId).catch(() => undefined);
  });
  await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*data.json*', requestStage: 'Request' }] }, page.sessionId);
  await evaluate(cdp, page.sessionId, `(()=>{document.activeElement?.blur();document.getElementById('serverRefresh').click()})()`);
  await waitFor(cdp, page.sessionId, `document.getElementById('toast').textContent === 'Сервер объединён. Локальные правки сохранены.' && !document.getElementById('serverRefresh').disabled && document.getElementById('saveState').textContent === 'Сохранено'`, 45000);
  await cdp.send('Fetch.disable', {}, page.sessionId);
  removeMock();
  const refreshed = await evaluate(cdp, page.sessionId, idbCountExpression);
  check(refreshed.count === 2852 && refreshed.families === 2852 && refreshed.added === 1, 'HTTP: server merge lost fields or new addition');
  check(refreshed.marker === 1, 'HTTP: server merge overwrote local edit');
}

async function main() {
  if (!fs.existsSync(chromePath)) throw new Error(`Chrome not found: ${chromePath}`);
  const { child, websocketUrl } = await launchChrome();
  const cdp = new Cdp(websocketUrl);
  try {
    await cdp.connect();

    const httpPage = await createPage(cdp);
    const removeHttp = await navigate(cdp, httpPage, httpUrl, 'HTTP');
    await validateCatalog(cdp, httpPage, 'HTTP');
    await validateHttpRefresh(cdp, httpPage);
    removeHttp();

    const filePage = await createPage(cdp);
    const removeFile = await navigate(cdp, filePage, fileUrl, 'file://');
    await validateCatalog(cdp, filePage, 'file://');
    const fileDb = await evaluate(cdp, filePage.sessionId, idbCountExpression);
    check(fileDb.count === 2852 && fileDb.families === 2852, 'file://: static snapshot did not populate IndexedDB');
    removeFile();

    for (const surface of surfaces) check(surface.errors.length === 0, `${surface.label}: console errors: ${surface.errors.join(' | ')}`);
  } finally {
    try { await cdp.send('Browser.close'); } catch (error) { child.kill('SIGTERM'); }
    cdp.socket?.close();
    await Promise.race([
      new Promise((resolve) => child.once('exit', resolve)),
      delay(3000)
    ]);
    if (child.exitCode === null) {
      child.kill('SIGTERM');
      await Promise.race([
        new Promise((resolve) => child.once('exit', resolve)),
        delay(1000)
      ]);
    }
    if (child.exitCode === null) {
      child.kill('SIGKILL');
      await Promise.race([
        new Promise((resolve) => child.once('exit', resolve)),
        delay(1000)
      ]);
    }
    await removeTemporaryProfile();
  }

  if (failures.length) {
    console.error(`FAIL ${failures.length}/${assertions}`);
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }
  console.log(`PASS ${assertions} browser assertions; HTTP console=0; file console=0; refresh=PASS`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error.stack || error);
  removeTemporaryProfile().finally(() => process.exit(1));
});
