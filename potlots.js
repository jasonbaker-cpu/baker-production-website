// Render "potential lots" images through bakerproduction.com/lots auto mode. usage: node potlots.js jobs.json  (site served on :8766)
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const jobs = JSON.parse(fs.readFileSync(process.argv[2])); const b = await chromium.launch();
  for (const j of jobs) {
    const pg = await (await b.newContext({ viewport: { width: 1400, height: 950 } })).newPage();
    try {
      await pg.goto('http://127.0.0.1:8766' + j.url, { waitUntil: 'load' });
      await pg.waitForFunction(() => window.__lotsReady === true, null, { timeout: 60000 });
      await pg.evaluate(() => document.fonts && document.fonts.load('700 40px Poppins')).catch(() => {});
      await pg.waitForTimeout(800);
      const data = await pg.evaluate(() => window.__lotsExport());
      fs.writeFileSync(j.out, Buffer.from(data.split(',')[1], 'base64')); console.log('ok', j.out);
    } catch (e) { console.log('fail', j.out, e.message.split('\n')[0]); }
    await pg.close();
  }
  await b.close();
})();
