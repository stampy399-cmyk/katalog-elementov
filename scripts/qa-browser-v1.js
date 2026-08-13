#!/usr/bin/env node

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

const root = path.resolve(__dirname, '..');
const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const args = process.argv.slice(2);
const comparisonOnly = args.includes('--comparison-only');
const httpUrl = args.find((argument) => !argument.startsWith('--')) || 'http://127.0.0.1:8765/index.html';
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

function comparisonAssetSha256(source) {
  const asset = path.join(root, String(source || '').replace(/^\/+/, ''));
  return fs.existsSync(asset) ? crypto.createHash('sha256').update(fs.readFileSync(asset)).digest('hex') : '';
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
    cdp.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false }, sessionId)
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
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text || 'Runtime evaluation failed');
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
  const snapshot = await evaluate(cdp, sessionId, `document.body.innerText.slice(0,500)`).catch(() => 'document unavailable');
  throw new Error(`waitFor timeout: ${expression}\nDOM: ${snapshot}`);
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
  await waitFor(cdp, page.sessionId, `document.querySelectorAll('.ability-family-summary').length === 16 && document.querySelector('[data-ability-stat="total"]')?.textContent === '167' && document.querySelector('.ability-family-count')?.textContent.includes('3')`);
  const collapsed = await evaluate(cdp, page.sessionId, `(()=>{const rows=[...document.querySelectorAll('.capability-family')];const first=rows[0]?.querySelector('.ability-family-summary');const options=[...document.getElementById('familyFilter').options].map(option=>option.value);return {rows:rows.length,summaries:document.querySelectorAll('.ability-family-summary').length,open:document.querySelectorAll('.capability-family.is-open').length,cards:document.querySelectorAll('.comparison-card').length,abilities:document.querySelectorAll('.ability-card').length,media:document.querySelectorAll('[data-lightbox-media]').length,stats:[...document.querySelectorAll('[data-ability-stat]')].map(node=>Number(node.textContent)),options,name:first?.querySelector('.ability-family-name')?.textContent.trim(),counts:[...first.querySelectorAll('.ability-family-count')].map(node=>node.textContent.trim()),percent:first?.querySelector('.ability-family-percent')?.textContent.trim(),expanded:first?.getAttribute('aria-expanded'),hash:location.hash,theme:document.documentElement.dataset.theme,navActive:document.querySelector('#viewSwitch [data-view="comparison"]')?.classList.contains('is-active')}})()`);
  check(collapsed.rows === 16 && collapsed.summaries === 16 && collapsed.open === 0, `${label}: default family rows are not 16 collapsed summaries`);
  check(collapsed.cards === 0 && collapsed.abilities === 0 && collapsed.media === 0, `${label}: collapsed view eagerly rendered cards or media`);
  check(collapsed.name === 'KEYFRAMES-MOTION' && collapsed.counts.join('|') === 'Умеем 1:1 · 3|Частично · 1|Не умеем · 0' && collapsed.percent === '75% 1:1', `${label}: first family summary mismatch`);
  check(collapsed.stats.join('|') === '167|121|46|0', `${label}: ability statistics mismatch`);
  check(collapsed.options.length === 17 && !collapsed.options.includes('OTHER') && !collapsed.options.includes('EMPTY'), `${label}: comparison family filter still contains OTHER or EMPTY`);
  check(collapsed.theme === 'dark', `${label}: comparison did not preserve the dark theme`);
  check(collapsed.hash === '#comparison' && collapsed.navActive, `${label}: comparison navigation state mismatch`);
  const pairModel = await evaluate(cdp, page.sessionId, `globalThis.SRAVNENIE.families.map(entry=>({family:entry.family,ours:entry.pairs.filter(pair=>/^assets\\/ours\\/pairs\\/.+-ours\\.mp4$/.test(pair.our_media||'')).length,competitors:entry.pairs.filter(pair=>/^assets\\/clips\\/.+\\.mp4$/.test(pair.competitor_media||'')).length,total:entry.pairs.length,legacy:['our_media','our_poster','competitor_clips','competitor_refs','competitor_frames'].some(field=>field in entry)}))`);
  check(pairModel.length === 16 && pairModel.reduce((total, entry) => total + entry.total, 0) === 42, `${label}: comparison model is not 42 pairs across 16 families`);
  check(pairModel.every((entry) => entry.ours === entry.competitors && entry.ours === entry.total && !entry.legacy), `${label}: family our/competitor counts differ or legacy media fields remain`);
  await evaluate(cdp, page.sessionId, `document.querySelector('.ability-family-summary').click()`);
  await waitFor(cdp, page.sessionId, `document.querySelectorAll('.ability-card').length === 4`);
  await waitFor(cdp, page.sessionId, `document.querySelectorAll('.comparison-card video').length === 2`);
  const comparison = await evaluate(cdp, page.sessionId, `(()=>{const cards=[...document.querySelectorAll('.ability-card')];const heights=cards.map(card=>card.getBoundingClientRect().height);const comparisonCard=document.querySelector('.comparison-card');const columns=getComputedStyle(document.querySelector('.comparison-columns')).gridTemplateColumns.split(' ').length;const html=document.querySelector('.comparison-page').innerHTML;const forbidden=['TODO:','DEBUG','placeholder','Нашего образца пока нет','Референсов нет','Комментарий не добавлен','семейство не входило в визуальную сверку','undefined','null'];return {pairs:document.querySelectorAll('.comparison-card').length,pairIndex:Number(comparisonCard.dataset.pairIndex),pairCount:Number(comparisonCard.dataset.pairCount),ourVideos:document.querySelectorAll('.comparison-media video').length,ourSource:document.querySelector('.comparison-media video')?.src,competitorVideos:document.querySelectorAll('.competitor-carousel video').length,competitorSource:document.querySelector('.competitor-carousel video')?.src,images:document.querySelectorAll('.comparison-page img').length,tech:document.querySelectorAll('.ability-card .tech-passport').length,abilities:cards.length,groups:document.querySelectorAll('.abilities-group').length,open:document.querySelectorAll('.capability-family.is-open').length,samples:document.querySelectorAll('.ability-sample-button').length,inlineMedia:document.querySelectorAll('.ability-card img,.ability-card video').length,exact:document.querySelectorAll('.ability-card .tech-status.is-exact').length,partial:document.querySelectorAll('.ability-card .tech-status.is-partial').length,unavailable:document.querySelectorAll('.ability-card .tech-status.is-unavailable').length,pairsButtons:document.querySelectorAll('[data-lightbox-pair]').length,variant:document.querySelector('.competitor-variant')?.textContent.trim(),variantSize:parseFloat(getComputedStyle(document.querySelector('.competitor-variant')).fontSize),headings:[...document.querySelectorAll('.comparison-side h3')].map(node=>node.textContent.trim()),rowMin:Math.min(...heights),rowMax:Math.max(...heights),equalRows:Math.max(...heights)-Math.min(...heights)<1,columns,legacy:/assets\\/ours\\/(?!pairs\\/)/.test(html),forbidden:forbidden.filter(text=>document.querySelector('.comparison-page').textContent.includes(text))}})()`);
  check(comparison.pairs === 1 && comparison.ourVideos === 1 && comparison.competitorVideos === 1 && comparison.images === 0, `${label}: expanded view is not one video pair`);
  check(comparison.pairIndex === 0 && comparison.pairCount === 3 && /\/assets\/ours\/pairs\/keyframes-motion-ref1-ours\.mp4$/.test(comparison.ourSource) && /\/assets\/clips\/keyframes-motion-ref1\.mp4$/.test(comparison.competitorSource), `${label}: first active pair is not bound one-to-one`);
  check(comparison.abilities === 4 && comparison.groups === 1 && comparison.open === 1 && comparison.tech === 4, `${label}: expanded ability/group/passport counters mismatch`);
  check(comparison.exact === 3 && comparison.partial === 1 && comparison.unavailable === 0, `${label}: expanded ability status counters mismatch`);
  check(comparison.samples === 0 && comparison.inlineMedia === 0 && comparison.pairsButtons === 1, `${label}: legacy ability samples or pair controls mismatch`);
  check(comparison.equalRows && comparison.rowMin >= 48 && comparison.rowMax <= 50 && comparison.columns === 2, `${label}: closed ability rows or video columns are uneven`);
  check(comparison.headings.join('|') === 'НАШ ОБРАЗЕЦ|КОНКУРЕНТ' && comparison.variant && comparison.variantSize <= 11, `${label}: pair headings or competitor caption mismatch`);
  check(!comparison.legacy && comparison.forbidden.length === 0, `${label}: legacy media, placeholder, debug, or service text leaked into DOM`);
  await evaluate(cdp, page.sessionId, `document.querySelector('.ability-card .tech-passport summary').click()`);
  const passport = await evaluate(cdp, page.sessionId, `(()=>{const cards=[...document.querySelectorAll('.ability-card')];const details=cards[0].querySelector('.tech-passport');const closed=cards.slice(1).map(card=>card.getBoundingClientRect().height);return {open:details.open,fields:details.querySelectorAll('.tech-field').length,text:details.textContent,openHeight:cards[0].getBoundingClientRect().height,closedMin:Math.min(...closed),closedMax:Math.max(...closed),inlineMedia:cards[0].querySelectorAll('img,video').length}})()`);
  check(passport.open && passport.fields === 3 && !passport.text.includes('TODO:') && !passport.text.includes('assets/ours/') && passport.inlineMedia === 0, `${label}: ability tech passport did not open cleanly`);
  check(passport.openHeight > passport.closedMax && passport.closedMax - passport.closedMin < 1, `${label}: passport expansion broke flat closed rows`);

  const carouselBefore = await evaluate(cdp, page.sessionId, `({ours:document.querySelector('.comparison-media video').src,competitor:document.querySelector('.competitor-carousel video').src,caption:document.querySelector('.competitor-variant').textContent.trim()})`);
  await evaluate(cdp, page.sessionId, `document.querySelector('[data-comparison-next]').click()`);
  await waitFor(cdp, page.sessionId, `document.querySelector('.comparison-media video').src !== ${JSON.stringify(carouselBefore.ours)} && document.querySelector('.competitor-carousel video').src !== ${JSON.stringify(carouselBefore.competitor)}`);
  const carouselNext = await evaluate(cdp, page.sessionId, `({ours:document.querySelector('.comparison-media video').src,competitor:document.querySelector('.competitor-carousel video').src,caption:document.querySelector('.competitor-variant').textContent.trim(),videos:document.querySelectorAll('.comparison-card video').length,index:Number(document.querySelector('.comparison-card').dataset.pairIndex)})`);
  check(carouselNext.videos === 2 && carouselNext.index === 1 && carouselNext.ours !== carouselBefore.ours && carouselNext.competitor !== carouselBefore.competitor && carouselNext.caption !== carouselBefore.caption, `${label}: pair carousel did not replace both active clips`);

  await evaluate(cdp, page.sessionId, `document.querySelector('[data-lightbox-pair]').click()`);
  await waitFor(cdp, page.sessionId, `document.querySelectorAll('#lightbox.is-open .lightbox-pair video').length === 2 && [...document.querySelectorAll('#lightbox.is-open .lightbox-pair video')].every(video=>video.readyState>=2)`, 45000);
  const pairStart = await evaluate(cdp, page.sessionId, `(()=>{const videos=[...document.querySelectorAll('.lightbox-pair video')];return {media:document.querySelectorAll('.lightbox-pair .lightbox-media').length,counter:document.getElementById('lightboxCounter').textContent,ours:videos[0]?.src,competitor:videos[1]?.src,playing:videos.every(video=>video.muted&&video.loop&&video.autoplay&&!video.paused)}})()`);
  check(pairStart.media === 2 && pairStart.counter === '2 / 3' && pairStart.ours === carouselNext.ours && pairStart.competitor === carouselNext.competitor && pairStart.playing, `${label}: side-by-side lightbox did not use the active pair`);
  await evaluate(cdp, page.sessionId, `document.querySelector('[data-lightbox-next]').click()`);
  await waitFor(cdp, page.sessionId, `document.getElementById('lightboxCounter').textContent === '3 / 3' && [...document.querySelectorAll('#lightbox.is-open .lightbox-pair video')].every(video=>video.readyState>=2&&!video.paused)`, 45000);
  const pairNext = await evaluate(cdp, page.sessionId, `(()=>{const videos=[...document.querySelectorAll('.lightbox-pair video')];return {counter:document.getElementById('lightboxCounter').textContent,ours:videos[0]?.src,competitor:videos[1]?.src}})()`);
  check(pairNext.counter === '3 / 3' && pairNext.ours !== pairStart.ours && pairNext.competitor !== pairStart.competitor, `${label}: side-by-side next button did not replace both clips`);
  await evaluate(cdp, page.sessionId, `document.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}))`);
  await waitFor(cdp, page.sessionId, `document.getElementById('lightboxCounter').textContent === '1 / 3' && [...document.querySelectorAll('#lightbox.is-open .lightbox-pair video')].every(video=>video.readyState>=2&&!video.paused)`, 45000);
  const pairWrapped = await evaluate(cdp, page.sessionId, `(()=>{const videos=[...document.querySelectorAll('.lightbox-pair video')];return {ours:videos[0]?.src,competitor:videos[1]?.src}})()`);
  check(pairWrapped.ours === carouselBefore.ours && pairWrapped.competitor === carouselBefore.competitor, `${label}: side-by-side keyboard navigation broke pair binding`);
  await evaluate(cdp, page.sessionId, `document.getElementById('lightbox').click()`);
  await waitFor(cdp, page.sessionId, `!document.getElementById('lightbox').classList.contains('is-open')`);

  await evaluate(cdp, page.sessionId, `document.querySelector('[data-ability-family-toggle="PHOTO-IMAGE"]').click()`);
  await waitFor(cdp, page.sessionId, `document.querySelector('[data-capability-family="PHOTO-IMAGE"].is-open .abilities-group')`);
  const formerStaticFamily = await evaluate(cdp, page.sessionId, `(()=>{const family=document.querySelector('[data-capability-family="PHOTO-IMAGE"]');const card=family.querySelector('.comparison-card');return {pairs:family.querySelectorAll('.comparison-card').length,pairCount:Number(card?.dataset.pairCount),abilities:family.querySelectorAll('.ability-card').length,videos:family.querySelectorAll('video').length,images:family.querySelectorAll('img').length,ours:family.querySelector('.comparison-media video')?.src,competitor:family.querySelector('.competitor-carousel video')?.src,placeholders:family.querySelectorAll('.comparison-media-placeholder').length}})()`);
  check(formerStaticFamily.pairs === 1 && formerStaticFamily.pairCount === 3 && formerStaticFamily.abilities > 0 && formerStaticFamily.videos === 2 && formerStaticFamily.images === 0 && formerStaticFamily.placeholders === 0, `${label}: formerly static PHOTO-IMAGE family is not a full video pair block`);
  check(/\/assets\/ours\/pairs\/photo-image-ref1-ours\.mp4$/.test(formerStaticFamily.ours) && /\/assets\/clips\/photo-image-ref1\.mp4$/.test(formerStaticFamily.competitor), `${label}: PHOTO-IMAGE pair binding mismatch`);

  await evaluate(cdp, page.sessionId, `(()=>{const select=document.getElementById('familyFilter');select.value='KEYFRAMES-MOTION';select.dispatchEvent(new Event('change',{bubbles:true}))})()`);
  await waitFor(cdp, page.sessionId, `document.querySelectorAll('.comparison-card').length === 1`);
  check(await evaluate(cdp, page.sessionId, `document.querySelector('.comparison-family')?.textContent === 'KEYFRAMES-MOTION'`), `${label}: comparison family filter mismatch`);
  check(await evaluate(cdp, page.sessionId, `document.querySelectorAll('.ability-card').length === 4`), `${label}: comparison family ability filter mismatch`);

  await evaluate(cdp, page.sessionId, `(()=>{const select=document.getElementById('familyFilter');select.value='all';select.dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('[data-view="catalog"]').click()})()`);
  await waitFor(cdp, page.sessionId, `document.querySelectorAll('.element-card').length > 0 && !document.querySelector('.comparison-page')`);
  check(await evaluate(cdp, page.sessionId, `document.getElementById('familyFilter').options.length === 19`), `${label}: catalog family filter did not restore 18 families`);
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
  const comparison = JSON.parse(fs.readFileSync(path.join(root, 'sravnenie.json'), 'utf8'));
  const pairs = comparison.families.flatMap((entry) => entry.pairs || []);
  const ourSources = pairs.map((pair) => pair.our_media);
  const competitorSources = pairs.map((pair) => pair.competitor_media);
  const ourHashes = ourSources.map(comparisonAssetSha256);
  const competitorHashes = competitorSources.map(comparisonAssetSha256);
  check(pairs.length === 42 && new Set(ourSources).size === 42 && new Set(competitorSources).size === 42, 'comparison data contains duplicate media paths');
  check(ourHashes.every(Boolean) && new Set(ourHashes).size === 42, 'comparison data contains duplicate our sample content');
  check(competitorHashes.every(Boolean) && new Set(competitorHashes).size === 42, 'comparison data contains duplicate competitor clip content');
  const { child, websocketUrl } = await launchChrome();
  const cdp = new Cdp(websocketUrl);
  try {
    await cdp.connect();

    const httpPage = await createPage(cdp);
    const removeHttp = await navigate(cdp, httpPage, httpUrl, 'HTTP');
    await validateCatalog(cdp, httpPage, 'HTTP');
    if (!comparisonOnly) await validateHttpRefresh(cdp, httpPage);
    removeHttp();

    if (!comparisonOnly) {
      const filePage = await createPage(cdp);
      const removeFile = await navigate(cdp, filePage, fileUrl, 'file://');
      await validateCatalog(cdp, filePage, 'file://');
      const fileDb = await evaluate(cdp, filePage.sessionId, idbCountExpression);
      check(fileDb.count === 2852 && fileDb.families === 2852, 'file://: static snapshot did not populate IndexedDB');
      removeFile();
    }

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
  console.log(comparisonOnly
    ? `PASS ${assertions} browser assertions; HTTP console=0; comparison=PASS`
    : `PASS ${assertions} browser assertions; HTTP console=0; file console=0; refresh=PASS`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error.stack || error);
  removeTemporaryProfile().finally(() => process.exit(1));
});
