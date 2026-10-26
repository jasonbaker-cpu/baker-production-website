// Replays the portal exactly as a VA opens it (?open=<day>/<slug>), captures every photo's finished canvas (top half), writes one sheet per job.
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const day = process.argv[2], slugs = process.argv.slice(3), out = process.env.OUT || 'qc/portal';
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1900, height: 950 } });
  for (const slug of slugs) {
    await pg.goto(`http://127.0.0.1:8766/pins/?open=${day}/${slug}`, { waitUntil: 'load' });
    await pg.waitForFunction(() => document.querySelectorAll('.thumb').length > 0, null, { timeout: 120000 });
    await pg.waitForTimeout(1500);
    const url = await pg.evaluate(async () => {
      const ths = [...document.querySelectorAll('.thumb')], cv = document.getElementById('cv'), W = 900, parts = [];
      const idle = async () => { for (let i = 0; i < 240; i++) { await new Promise(r => setTimeout(r, 250)); if (document.getElementById('busy').hidden) break; } await new Promise(r => setTimeout(r, 800)); };
      for (const t of ths) { t.click(); await idle(); const sh = Math.round(cv.height * 0.55); const o = document.createElement('canvas'); o.width = W; o.height = Math.round(sh * W / cv.width); o.getContext('2d').drawImage(cv, 0, 0, cv.width, sh, 0, 0, o.width, o.height); parts.push(o); }
      const S = document.createElement('canvas'); S.width = W * 2; S.height = Math.ceil(parts.length / 2) * parts[0].height; const x = S.getContext('2d');
      parts.forEach((o, i) => x.drawImage(o, (i % 2) * W, Math.floor(i / 2) * o.height)); return S.toDataURL('image/jpeg', 0.82);
    });
    fs.writeFileSync(`${out}/${day}_${slug}.jpg`, Buffer.from(url.split(',')[1], 'base64')); console.log('captured', slug);
  }
  await b.close();
})();
