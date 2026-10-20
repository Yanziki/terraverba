// Frame rate of the home globe (auto-rotating) for a few seconds, and the
// heaviest JavaScript functions over that time. "jitless" runs V8 without its
// compiler, as Edge does in its enhanced security mode for unfamiliar sites.
//   node tools/perf-probe.mjs <url> [jitless] [phone]
import puppeteer from 'puppeteer-core';

const [url, ...flags] = process.argv.slice(2);
const jitless = flags.includes('jitless');
const phone = flags.includes('phone');
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new',
  args: [...(flags.includes('software') ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist']), ...(jitless ? ['--js-flags=--jitless'] : [])],
});
const page = await browser.newPage();
await page.setViewport(phone ? { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { width: 1440, height: 900 });
if (flags.includes('noblur')) await page.evaluateOnNewDocument(() => document.addEventListener('DOMContentLoaded', () => {
  const st = document.createElement('style');
  st.textContent = '* { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }';
  document.head.append(st);
}));
if (flags.includes('nolabels')) await page.evaluateOnNewDocument(() => document.addEventListener('DOMContentLoaded', () => {
  const st = document.createElement('style');
  st.textContent = '#labels, #instrument { display: none !important; }';
  document.head.append(st);
}));
await page.goto(url, { waitUntil: 'networkidle0', timeout: 120000 });
await new Promise((r) => setTimeout(r, 3000));
// "hide=halo,dots,sphere": leave parts of the scene out, to find what costs
const hide = flags.find((f) => f.startsWith('hide='))?.slice(5).split(',') ?? [];
if (hide.length) await page.evaluate((hide) => { const g = window.__glossa.globe; for (const k of hide) if (g[k]) g[k].visible = false; }, hide);
const inst = flags.find((f) => f.startsWith('instances='));
if (inst) await page.evaluate((n) => { window.__glossa.globe.dots.geometry.instanceCount = n; }, +inst.slice(10));
const cdp = await page.createCDPSession();
await cdp.send('Profiler.enable');
await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
await cdp.send('Profiler.start');
// "drag": keep turning the globe by hand while measuring
const drag = flags.includes('drag') && (async () => {
  const vp = page.viewport();
  await page.mouse.move(vp.width / 2, vp.height / 2);
  await page.mouse.down();
  for (let i = 0; i < 120; i++) {
    await page.mouse.move(vp.width / 2 + 200 * Math.sin(i / 10), vp.height / 2 + 60 * Math.cos(i / 13));
    await new Promise((r) => setTimeout(r, 40));
  }
  await page.mouse.up();
})();
const frames = await page.evaluate(() => new Promise((resolve) => {
  const t = [];
  const step = (now) => {
    t.push(now);
    if (now - t[0] < 5000) requestAnimationFrame(step);
    else resolve(t);
  };
  requestAnimationFrame(step);
}));
const { profile } = await cdp.send('Profiler.stop');
await drag;
const gaps = frames.slice(1).map((x, i) => x - frames[i]).sort((a, b) => a - b);
const self = new Map();
const dt = profile.timeDeltas;
const byId = new Map(profile.nodes.map((n) => [n.id, n]));
profile.samples.forEach((id, i) => {
  const n = byId.get(id);
  const k = `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.split('/').pop()}:${n.callFrame.lineNumber + 1}`;
  self.set(k, (self.get(k) ?? 0) + (dt[i] ?? 0) / 1000);
});
const total = [...self.values()].reduce((a, b) => a + b, 0);
const gpu = await page.evaluate(() => {
  const gl = document.createElement('canvas').getContext('webgl2');
  const ext = gl?.getExtension('WEBGL_debug_renderer_info');
  return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl?.getParameter(gl.RENDERER);
});
console.log({
  gpu, jitless, phone,
  fps: Math.round((frames.length - 1) / ((frames.at(-1) - frames[0]) / 1000)),
  medianFrameMs: +gaps[gaps.length >> 1].toFixed(1), p95FrameMs: +gaps[Math.floor(gaps.length * 0.95)].toFixed(1),
});
console.log([...self].filter(([k]) => !/^\((idle|program|garbage collector)\)/.test(k)).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => `${(v / total * 100).toFixed(1)}%  ${k}`).join('\n'));
console.log('idle', ((self.get('(idle) :0') ?? 0) / total * 100).toFixed(0) + '%');
await browser.close();
