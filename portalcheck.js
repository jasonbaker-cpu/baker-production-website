// Replays the portal exactly as a VA opens it (?open=<day>/<slug>), captures every photo's finished canvas (top half), writes one sheet per job.
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const day = process.argv[2], slugs = process.argv.slice(3), out = process.env.OUT || 'qc/portal';
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1900, height: 950 } });
  // fonts: the headless browser can't reach Google Fonts, so serve the same families from the local package
  const FD = require('path').join(__dirname, 'fonts') + '/';   // 29 Oct: fonts ship in the repo (old scratchpad path is gone)
  const ffc = (fam, file, w) => `@font-face{font-family:'${fam}';font-weight:${w};font-style:normal;src:url(data:font/woff2;base64,${fs.readFileSync(FD+file).toString('base64')}) format('woff2');}`;
  const CSS = [300,400,700].map(w=>ffc('Source Sans 3', `source-sans-3-latin-${w}-normal.woff2`, w)).join('') + [400,700].map(w=>ffc('Open Sans', `open-sans-latin-${w}-normal.woff2`, w)).join('');
  await pg.route(/fonts\.googleapis\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: CSS }));
  await pg.route(/fonts\.gstatic\.com/, r => r.abort());

  for (const slug of slugs) {
    await pg.goto(`http://127.0.0.1:8766/pins/?open=${day}/${slug}`, { waitUntil: 'load' });
    await pg.waitForFunction(() => document.querySelectorAll('.thumb').length > 0, null, { timeout: 120000 });
    { let last = -1, same = 0; for (let k = 0; k < 240 && same < 8; k++) { await pg.waitForTimeout(500); const n = await pg.evaluate(() => document.querySelectorAll('.thumb').length); if (n === last) same++; else { same = 0; last = n; } } console.log(slug, 'thumbs', last); }
    await pg.evaluate(() => Promise.all([document.fonts.load('400 40px "Source Sans 3"'), document.fonts.load('700 40px "Open Sans"')])); await pg.waitForTimeout(1500);
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
