// Re-export a published job with the sky replacement switched ON (e.g. overcast shoots wrongly treated as twilight).
// usage: node resky.js <day> <slug>   (needs the website served on :8766)
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const [day, slug] = process.argv.slice(2), out = `qc/resky/${slug}`; fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1900, height: 950 }, acceptDownloads: true }); const pg = await ctx.newPage();
  const FD = '/tmp/claude-0/-home-claude/123b6bc4-adfa-5095-9578-7622ec75f692/scratchpad/fontpkg/package/files/';
  const ffc = (fam, file, w) => `@font-face{font-family:'${fam}';font-weight:${w};font-style:normal;src:url(data:font/woff2;base64,${fs.readFileSync(FD+file).toString('base64')}) format('woff2');}`;
  const CSS = [300,400,700].map(w=>ffc('Source Sans 3', `source-sans-3-latin-${w}-normal.woff2`, w)).join('') + [400,700].map(w=>ffc('Open Sans', `open-sans-latin-${w}-normal.woff2`, w)).join('');
  await pg.route(/fonts\.googleapis\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: CSS }));
  await pg.route(/fonts\.gstatic\.com|cdnjs\.cloudflare\.com/, r => r.abort());
  await pg.goto(`http://127.0.0.1:8766/pins/?open=${day}/${slug}`, { waitUntil: 'load' });
  await pg.waitForFunction(() => document.querySelectorAll('.thumb').length > 0, null, { timeout: 120000 });
  { let last = -1, same = 0; for (let k = 0; k < 240 && same < 8; k++) { await pg.waitForTimeout(500); const n = await pg.evaluate(() => document.querySelectorAll('.thumb').length); if (n === last) same++; else { same = 0; last = n; } } }
  await pg.evaluate(() => Promise.all([document.fonts.load('400 40px "Source Sans 3"'), document.fonts.load('700 40px "Open Sans"')]));
  if (process.env.AGENCY) { await pg.selectOption('#agSel', process.env.AGENCY); await pg.waitForTimeout(500); }
  const n = await pg.evaluate(() => document.querySelectorAll('.thumb').length);
  const busy = () => pg.waitForFunction(() => document.getElementById('busy').hidden === true, null, { timeout: 400000 });
  for (let i = 0; i < n; i++) {
    await pg.locator('.thumb').nth(i).click(); await busy(); await pg.waitForTimeout(500);
    if (process.env.MAXPINS) { const drop = await pg.evaluate((mx) => { const ph = window.__bae.photo(); const P = (typeof job !== 'undefined' && job && job.places) || [];
        const pins = ph.pins.filter(q => !q.house).map(q => ({ n: q.name, d: ((P.find(x => x.name === q.name) || {}).dist) || 1e9 })).sort((a, b) => a.d - b.d); return pins.slice(+mx).map(x => x.n); }, process.env.MAXPINS);
      for (const nm of drop) { await pg.locator('.place', { hasText: nm }).first().click(); await pg.waitForTimeout(250); } if (drop.length) { await pg.evaluate(() => window.__bae.retidy()); await pg.waitForTimeout(300); } console.log('  dropped', drop.join(', ')); }
    if (process.env.SKYPLATE) await pg.evaluate((k) => { prefs.skyPlate = k; return new Promise(r => loadSkyPlate(k, () => { photos.forEach(q => { q.finKey = null; q.fin = null; }); r(); })); }, process.env.SKYPLATE);
    const ok = await pg.evaluate(() => window.__bae.setSky(true)); await pg.waitForTimeout(400); await busy(); await pg.waitForTimeout(1200);
    const [dl] = await Promise.all([pg.waitForEvent('download'), pg.click('#exportBtn')]);
    const name = dl.suggestedFilename(); await dl.saveAs(`${out}/${name}`); console.log('exported', name, ok);
  }
  fs.writeFileSync(`${out}/project.json`, await pg.evaluate(() => window.__bae.project()));
  await b.close();
})();
