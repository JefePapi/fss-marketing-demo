// Manual check (not part of npm test). Usage: node perf/staff-scroll.mjs [baseURL=http://127.0.0.1:4173/] [label] [cpuRate=4]
// Serve the folder first (python3 -m http.server 4173 --bind 127.0.0.1). Fails if any Staff page averages under 55 fps.
// Wheel-scrolls Staff view pages in every role at 1920x1080 and 2560x1440 with CPU throttling.
import { chromium } from 'playwright';
import fs from 'node:fs';
const base = process.argv[2] || 'http://127.0.0.1:4173/', label = process.argv[3] || 'local', rate = +(process.argv[4] || 4);
const sizes = [[1920,1080],[2560,1440]];
const pages = [
  ['marketing','queue','#/staff?show=all'],
  ['marketing','activities','#/activities'],
  ['marketing','notifications','#/staff/notifications'],
  ['marketing','request','#/staff/FIRST'],
  ['mgrA','my-activities','#/manager'],
  ['mgrA','activity+areas','#/activities/bowling'],
  ['mgrB','activity+areas','#/activities/club'],
  ['mgrB','my-activities','#/manager'],
];
const browser = await chromium.launch({ args: ['--enable-gpu-rasterization','--ignore-gpu-blocklist'] });
const out = [];
for (const [w,h] of sizes) {
  for (const [role, name, hash0] of pages) {
    const ctx = await browser.newContext({ viewport:{width:w,height:h} });
    const page = await ctx.newPage();
    await page.addInitScript(r => { localStorage.setItem('mktdemo.prefs', JSON.stringify({staff:true, role:r})); }, role);
    await page.goto(base + '#/staff'); await page.waitForSelector('#app h1');
    // 30 extra notices so the notifications list is long (like a busy week)
    await page.evaluate(() => { const k = Object.keys(localStorage).find(k => k!=='mktdemo.prefs' && k.startsWith('mktdemo')); const s = JSON.parse(localStorage.getItem(k)); const n = s.notices[0]; for (let i=0;i<30;i++) s.notices.push({...n, id:'nx'+i, read: i%3===0}); localStorage.setItem(k, JSON.stringify(s)); });
    let hash = hash0;
    if (hash.includes('FIRST')) hash = await page.evaluate(() => { const a = document.querySelector('[data-test="queue-card"] a[href^="#/staff/"]') || document.querySelector('a[href^="#/staff/MKT"]'); return a ? a.getAttribute('href') : '#/staff'; });
    await page.goto(base + hash); await page.reload(); await page.waitForSelector('#app h1'); await page.waitForTimeout(600);
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate });
    await page.mouse.move(w/2, h/2);
    await page.evaluate(() => { window.__lt=[]; window.__f=[]; try{ new PerformanceObserver(l=>{for(const e of l.getEntries()) window.__lt.push(e.duration);}).observe({type:'longtask'});}catch{}
      let last=performance.now(); const f=t=>{ window.__f.push(t-last); last=t; if(!window.__stop) requestAnimationFrame(f); }; requestAnimationFrame(f); });
    const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    const t0 = Date.now(); let dir = 1;
    while (Date.now() - t0 < 4000) { await page.mouse.wheel(0, dir*120); await page.waitForTimeout(16); const y = await page.evaluate(() => scrollY); if (y >= max-2) dir=-1; else if (y <= 0) dir=1; }
    const r = await page.evaluate(() => { window.__stop=true; const f=window.__f.slice(2); const tot=f.reduce((a,b)=>a+b,0); const s=[...f].sort((a,b)=>a-b); return { fps:+(f.length/(tot/1000)).toFixed(1), frames:f.length, over33:f.filter(x=>x>33.4).length, over50:f.filter(x=>x>50).length, p95:+s[Math.floor(s.length*.95)].toFixed(0), worst:+s.at(-1).toFixed(0), longTasks:window.__lt.length, longTaskMs:Math.round(window.__lt.reduce((a,b)=>a+b,0)) }; });
    const row = { size:`${w}x${h}`, cpu:`${rate}x`, role, page:name, scrollMax:max, ...r };
    out.push(row); console.log(JSON.stringify(row));
    await ctx.close();
  }
}
await browser.close();
fs.mkdirSync("test-results", { recursive: true }); fs.writeFileSync(`test-results/staff-scroll-${label}.json`, JSON.stringify(out, null, 1));
const slow = out.filter(r => r.scrollMax > 0 && r.fps < 55); if (slow.length) { console.error('SLOW:', slow.map(r => r.size+' '+r.role+' '+r.page+' '+r.fps).join('; ')); process.exit(1); }
