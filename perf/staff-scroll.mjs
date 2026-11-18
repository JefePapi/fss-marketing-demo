// node perf/staff-scroll.mjs [baseURL|offline] [label] [cpuRate=4] [theme=a] [chromium|firefox] [staff|design|feedback]
// design covers the five required pages at 1920. staff adds both resolutions and manager routes.
// Firefox runs at native speed. Only Chromium exposes CDP CPU throttling.
import { chromium, firefox } from 'playwright';
import fs from 'node:fs';
const [address = 'http://127.0.0.1:4173/', label = 'local', rateArg = '4', theme = 'a',
  engine = 'chromium', suite = 'staff'] = process.argv.slice(2);
const rate = Number(rateArg);
if (!['a','a-light','b','c','current'].includes(theme) || !['chromium','firefox'].includes(engine))
  throw new Error('Choose a valid design and browser.');
const offline = address === 'offline';
const base = new URL(offline ? 'http://demo.test/' : address);
base.searchParams.set('theme', theme);
const sizes = suite !== 'staff' ? [[1920,1080]] : [[1920,1080],[2560,1440]];
const designPages = [
  ['visitor','home','#/'], ['visitor','request','#/request'],
  ['marketing','queue','#/staff?show=all'], ['visitor','activities','#/activities'],
  ['marketing','activity+areas','#/activities/bowling'],
];
const feedbackPages = designPages.filter(([, name]) => ['home', 'queue', 'activities'].includes(name));
const pages = suite === 'feedback' ? feedbackPages : suite === 'design' ? designPages : [...designPages,
  ['marketing','notifications','#/staff/notifications'], ['marketing','staff-request','#/staff/FIRST'],
  ['mgrA','my-activities','#/manager'], ['mgrA','activity+areas','#/activities/bowling'],
  ['mgrB','activity+areas','#/activities/club'], ['mgrB','my-activities','#/manager'],
];
const browser = engine === 'firefox' ? await firefox.launch() :
  await chromium.launch({ args:['--enable-gpu-rasterization','--ignore-gpu-blocklist'] });
const mime = { html:'text/html', css:'text/css', js:'text/javascript', webp:'image/webp' };
const site = new URL('../', import.meta.url);
const out = [];
for (const [w,h] of sizes) {
  for (const [role, name, hash0] of pages) {
    const ctx = await browser.newContext({ viewport:{width:w,height:h} });
    const page = await ctx.newPage();
    if (offline) await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      const file = url.pathname.slice(1) || 'index.html';
      if (url.origin !== base.origin || !/^[a-z0-9./-]+$/i.test(file) || file.includes('..')) return route.abort();
      const contentType = mime[file.split('.').pop()];
      if (!contentType) return route.abort();
      await route.fulfill({ body:await fs.promises.readFile(new URL(file, site)), contentType });
    });
    await page.addInitScript(r => localStorage.setItem('mktdemo.prefs',
      JSON.stringify({staff:r !== 'visitor', role:r})), role);
    let hash = hash0;
    if (name === 'notifications' || hash.includes('FIRST')) {
      await page.goto(base.href + '#/staff');
      await page.waitForSelector('[data-test=queue-card]');
      if (name === 'notifications') await page.evaluate(() => {
        const state = JSON.parse(localStorage.getItem('mktdemo.v1'));
        for (let i=0; i<30; i++) state.notices.push({...state.notices[0], id:'nx'+i, read:i%3===0});
        localStorage.setItem('mktdemo.v1', JSON.stringify(state));
      });
      else hash = await page.locator('[data-test=queue-card]').first().getAttribute('href');
    }
    await page.goto(base.href + hash);
    if (name === 'notifications') await page.reload();
    await page.waitForSelector('#app h1');
    await page.waitForFunction(id => document.documentElement.dataset.theme === id, theme);
    await page.waitForTimeout(name === 'home' ? 1700 : 600);
    if (engine === 'chromium') {
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate });
    }
    // Step two has enough event fields to exercise real scrolling at 1080p.
    if (name === 'request') {
      await page.locator('#fill-sample').click();
      await page.locator('#btn-next').click();
      await page.waitForSelector('#step-2');
    }
    await page.mouse.move(w/2, h/2);
    await page.evaluate(() => { window.__lt=[]; window.__f=[]; try{ new PerformanceObserver(l=>{for(const e of l.getEntries()) window.__lt.push(e.duration);}).observe({type:'longtask'});}catch{}
      let last=performance.now(); const f=t=>{ window.__f.push(t-last); last=t; if(!window.__stop) requestAnimationFrame(f); }; requestAnimationFrame(f); });
    const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    const t0 = Date.now();
    let dir = 1, furthest = 0;
    while (Date.now() - t0 < 4000) {
      await page.mouse.wheel(0, dir * 120);
      await page.waitForTimeout(16);
      const y = await page.evaluate(() => scrollY);
      furthest = Math.max(furthest, y);
      if (y >= max - 2) dir = -1;
      else if (y <= 0) dir = 1;
    }
    const r = await page.evaluate(() => { window.__stop=true; const f=window.__f.slice(2); const tot=f.reduce((a,b)=>a+b,0); const s=[...f].sort((a,b)=>a-b); return { fps:+(f.length/(tot/1000)).toFixed(1), frames:f.length, over33:f.filter(x=>x>33.4).length, over50:f.filter(x=>x>50).length, p95:+s[Math.floor(s.length*.95)].toFixed(0), worst:+s.at(-1).toFixed(0), longTasks:window.__lt.length, longTaskMs:Math.round(window.__lt.reduce((a,b)=>a+b,0)) }; });
    const row = { size:`${w}x${h}`, cpu:engine === 'chromium' ? rate+'x' : 'native', theme, engine, role, page:name, scrollMax:max, furthest, ...r };
    out.push(row); console.log(JSON.stringify(row));
    await ctx.close();
  }
}
await browser.close();
fs.mkdirSync('test-results', { recursive:true });
const report = 'test-results/staff-scroll-' + label.replace(/[^a-z0-9-]/gi,'_') + '-' + engine + '-' + theme + '.json';
const tmp = report + '.' + process.pid + '.tmp';
fs.writeFileSync(tmp, JSON.stringify(out, null, 1));
fs.renameSync(tmp, report);
const slow = out.filter(r => r.scrollMax > 0 && (r.furthest === 0 || r.fps < 55)); if (slow.length) { console.error('SLOW:', slow.map(r => r.size+' '+r.role+' '+r.page+' '+r.fps).join('; ')); process.exit(1); }
