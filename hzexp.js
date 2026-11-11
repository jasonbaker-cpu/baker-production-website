// open a job, retidy every photo matching RE, export
const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{ const b=await chromium.launch(); const pg=await (await b.newContext({viewport:{width:1700,height:950},acceptDownloads:true})).newPage();
 const FD='/tmp/claude-0/-home-claude/123b6bc4-adfa-5095-9578-7622ec75f692/scratchpad/fontpkg/package/files/';
 const ffc=(fam,file,w)=>`@font-face{font-family:'${fam}';font-weight:${w};font-style:normal;src:url(data:font/woff2;base64,${fs.readFileSync(FD+file).toString('base64')}) format('woff2');}`;
 const CSS=[300,400,600,700].filter(w=>fs.existsSync(FD+`source-sans-3-latin-${w}-normal.woff2`)).map(w=>ffc('Source Sans 3',`source-sans-3-latin-${w}-normal.woff2`,w)).join('');
 await pg.route(/fonts\.googleapis\.com/, r=>r.fulfill({status:200,contentType:'text/css',body:CSS}));
 await pg.route(/fonts\.gstatic\.com|cdnjs\.cloudflare\.com|firestore\.googleapis/, r=>r.abort());
 await pg.goto('http://127.0.0.1:8766/pins/?open='+process.env.JOB,{waitUntil:'load'});
 await pg.waitForFunction(()=>document.querySelectorAll('.thumb').length>0,null,{timeout:120000}); await pg.waitForTimeout(10000);
 await pg.evaluate(()=>Promise.all([document.fonts.load('600 40px "Source Sans 3"'),document.fonts.load('400 40px "Source Sans 3"')]));
 const busy=()=>pg.waitForFunction(()=>document.getElementById('busy').hidden===true,null,{timeout:400000});
 const O=process.env.OUT; fs.mkdirSync(O,{recursive:true}); const n=await pg.evaluate(()=>document.querySelectorAll('.thumb').length);
 for (let i=0;i<n;i++){ const name=await pg.evaluate(i=>JSON.parse(window.__bae.project()).photos[i].name,i); if (!new RegExp(process.env.RE).test(name)) continue;
   await pg.locator('.thumb').nth(i).click(); await busy(); await pg.waitForTimeout(800);
   { const HZ=JSON.parse(process.env.HZ||'{}'); const k=Object.keys(HZ).find(k=>name.includes(k)); if (k){ await pg.evaluate(v=>window.__bae.setSky(true,true),0); await busy(); await pg.evaluate(v=>window.__bae.setHorizon(v,v),HZ[k]); await busy(); await pg.waitForTimeout(800);} }
   if (process.env.BR) await pg.evaluate(br=>window.__bae.setAdj({con:10,bright:br}),+process.env.BR);
   await pg.waitForTimeout(1200);
   const cl=await pg.evaluate(()=>window.__bae.photo().pins.filter(x=>x.clash).map(x=>x.name));
   const [dl]=await Promise.all([pg.waitForEvent('download'),pg.click('#exportBtn')]); await dl.saveAs(`${O}/${name}`); console.log('exported',name,'clash',JSON.stringify(cl)); }
 const pr=JSON.parse(await pg.evaluate(()=>window.__bae.project())); pr.photos=pr.photos.filter(q=>new RegExp(process.env.RE).test(q.name)); fs.writeFileSync(`${O}/project.json`,JSON.stringify(pr));
 await b.close(); })();
