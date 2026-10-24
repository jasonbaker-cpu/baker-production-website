// ================= tabs =================
const tabs = { pins:$("tabPins"), boundary:$("tabBoundary"), photo:$("tabPhoto") };
function setTab(t){
  ptab = t; LS.set("ptab", t);
  Object.keys(tabs).forEach(k=>{ tabs[k].hidden = k!==t; $("tabBtn"+k[0].toUpperCase()+k.slice(1)).setAttribute("aria-selected", k===t); });
  refreshPanel();
}
Object.keys(tabs).forEach(k=>$("tabBtn"+k[0].toUpperCase()+k.slice(1)).addEventListener("click",()=>setTab(k)));
function refreshAll(){ refreshStrip(); refreshPinsTab(); refreshBoundaryTab(); refreshPhotoTab(); refreshPanel(); updateUndo(); updateDrawbar(); setHint(); requestDraw(); }
function slider(id, label, min, max, step, val, fmt, onInput, onStart){
  const r = el(`<div class="row"><label class="lbl" for="${id}">${label}</label><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}"><span class="val">${fmt(val)}</span></div>`);
  const i = r.querySelector("input");
  i.addEventListener("pointerdown", ()=>onStart && onStart()); i.addEventListener("keydown", ()=>onStart && onStart());
  i.addEventListener("input", ()=>{ r.querySelector(".val").textContent = fmt(+i.value); onInput(+i.value); });
  return r;
}

// ================= Pins tab =================
let placeFilter = "";
function refreshPinsTab(){
  const box = tabs.pins; box.innerHTML = ""; const p = P();
  // property
  const s1 = el(`<section class="sec"><h2><span>Property</span></h2></section>`);
  if (!job){
    s1.appendChild(el(`<p class="note">Load the job's amenity map to list the checked nearby places. It's the <b>_map.html</b> in the job's Dropbox folder, under <b>Aerial - Drone Photography</b>.</p>`));
    const b = el(`<button class="btn primary wide">Load amenity map</button>`); b.onclick=()=>$("jobIn").click(); s1.appendChild(b);
  } else {
    const r = el(`<div class="row" style="justify-content:space-between;align-items:flex-start"><div style="min-width:0"><div style="font-weight:600" class="t"></div><div class="note">${job.places.length} checked places${job.sample?" · sample":""}</div></div><button class="btn ghost" style="height:26px;padding:0 9px;font-size:12px;flex:none">Change</button></div>`);
    r.querySelector(".t").textContent = job.address; r.querySelector("button").onclick=()=>$("jobIn").click(); s1.appendChild(r);
  }
  box.appendChild(s1);
  if (!p) return;
  // line up
  const s2 = el(`<section class="sec"><h2><span>Line up this photo</span><span class="note" id="luState"></span></h2></section>`);
  const st = s2.querySelector("#luState");
  if (!p.cam){
    st.textContent = "";
    s2.appendChild(el(`<p class="note">This photo has no GPS, so pins can't be placed for you. Tick a place, then click where it is. Or read the position from the untouched drone JPG.</p>`));
    const b = el(`<button class="btn wide">Read position from original drone JPG</button>`); b.onclick=()=>$("metaIn").click(); s2.appendChild(b);
  } else {
    const houseA = p.anchors.find(a=>a.key==="__house"), lms = p.anchors.filter(a=>a.key!=="__house");
    const step1Done = p.cam.fromGimbal || !!houseA;
    st.innerHTML = p.cam.ready ? `<span class="good">${p.anchors.length>=2 ? "Accurate" : "Lined up"}</span>` : "Needs one click";
    const steps = el(`<div class="steps"></div>`);
    const s1e = el(`<div class="step ${step1Done?"done":"now"}"><i>${step1Done?"✓":"1"}</i><div></div></div>`);
    const d1 = s1e.querySelector("div");
    if (p.cam.fromGimbal && !houseA) d1.appendChild(el(`<p class="note">Heading and tilt read from the drone. Click the house to fine-tune if pins look off.</p>`));
    else d1.appendChild(el(`<p class="note">${houseA ? "Lined up on the house." : "Click the subject house's roof. The photo's GPS and horizon do the rest."}</p>`));
    const hb = el(`<button class="btn ${step1Done?"":"primary"} wide${armed&&armed.kind==="house"?" armed":""}">${armed&&armed.kind==="house" ? "Click the house…" : houseA ? "Re-click the house" : "Click the house"}</button>`);
    hb.disabled = !job; hb.onclick = ()=>{ armed = armed&&armed.kind==="house" ? null : { kind:"house" }; setTool("select"); setHint(); refreshPinsTab(); };
    d1.appendChild(hb); steps.appendChild(s1e);
    const s2e = el(`<div class="step ${lms.length?"done":step1Done?"now":""}"><i>${lms.length?"✓":"2"}</i><div></div></div>`);
    const d2 = s2e.querySelector("div");
    d2.appendChild(el(`<p class="note">${lms.length ? `Lined up on ${lms.map(a=>escapeHtml(a.name)).join(", ")}.` : "For pins within a few pixels, click one far landmark you can see clearly (a stadium, the CBD, a shopping centre roof)."}</p>`));
    const vis = allPlaces().filter(q=>q.dist>600).map(q=>({ q, at: p.cam.ready ? projectW(p, q.lat, q.lng) : null })).filter(o=>!p.cam.ready || inFrame(p, o.at, -p.w*0.02)).sort((a,b)=>(b.q.landmark?1:0)-(a.q.landmark?1:0) || (a.q.landmark ? a.q.dist-b.q.dist : b.q.dist-a.q.dist));
    const row = el(`<div class="row"><select id="lmSel" aria-label="Landmark"></select><button class="btn" id="lmGo" style="flex:none">Click it</button></div>`);
    const selEl = row.querySelector("select");
    vis.forEach(o=>{ const op=document.createElement("option"); op.value=o.q.key; op.textContent=`${o.q.name} · ${fmtDist(o.q.dist)}`; selEl.appendChild(op); });
    if (!vis.length){ const op=document.createElement("option"); op.textContent="No landmarks in view"; selEl.appendChild(op); }
    const lb = row.querySelector("#lmGo"); lb.disabled = !step1Done || !vis.length || !job;
    if (armed && armed.kind==="landmark"){ lb.textContent = "Click it…"; lb.classList.add("armed"); selEl.value = armed.key; }
    lb.onclick = ()=>{ armed = armed&&armed.kind==="landmark" ? null : { kind:"landmark", key:selEl.value }; setTool("select"); setHint(); refreshPinsTab(); };
    d2.appendChild(row); steps.appendChild(s2e);
    s2.appendChild(steps);
    if (p.anchors.length){ const r = el(`<button class="btn ghost" style="align-self:flex-start;height:26px;font-size:12px">Clear line-up clicks</button>`); r.onclick=()=>{ commit(); p.anchors=[]; p.cam = makeCam(p.meta); refreshAll(); }; s2.appendChild(r); }
    if (p.cam.ready && p.cam.err != null && p.anchors.length>=2 && p.cam.err > 60) s2.appendChild(el(`<p class="note" style="color:#e8c070">Clicks disagree by ${Math.round(p.cam.err)} px. Re-check you clicked the exact spot on each.</p>`));
  }
  box.appendChild(s2);
  // places
  if (job){
    const s3 = el(`<section class="sec"><h2><span>Places</span><span class="note" id="plCount"></span></h2></section>`);
    const hr = el(`<div class="row"><button class="btn wide" id="plHouse"></button><button class="btn" id="plCustom">Custom pin</button></div>`);
    const hasHouse = p.pins.some(x=>x.house);
    hr.querySelector("#plHouse").textContent = hasHouse ? "House pin ✓" : "Add house pin";
    hr.querySelector("#plHouse").onclick = ()=>{ if (hasHouse){ const hp=p.pins.find(x=>x.house); sel={kind:"pin",id:hp.id}; refreshPanel(); requestDraw(); } else addHousePin(); };
    hr.querySelector("#plCustom").onclick = ()=>{ armed={kind:"custom"}; setHint(); };
    s3.appendChild(hr);
    const fi = el(`<input type="text" id="plFilter" placeholder="Filter places" aria-label="Filter places">`); fi.value = placeFilter; s3.appendChild(fi);
    const list = el(`<div class="places" role="list"></div>`);
    const f = placeFilter.trim().toLowerCase(); let on = 0;
    const groups = [["Nearby (amenity map)", allPlaces().filter(q=>!q.landmark)], ["Landmarks", allPlaces().filter(q=>q.landmark).sort((a,b)=>a.dist-b.dist)]];
    for (const [gname, items] of groups){
      const shown = items.filter(q=>!f || q.name.toLowerCase().includes(f) || (q.cat||"").includes(f));
      if (!shown.length) continue;
      list.appendChild(el(`<div class="grp">${gname}</div>`));
      for (const q of shown){
        const has = p.pins.some(x=>x.key===q.key); if (has) on++;
        const vis = p.cam && p.cam.ready ? !!autoPoint(p, q.lat, q.lng) : true;
        const badge = q.school==="zoned" ? `<span class="badge">ZONED</span>` : q.school==="unverified" ? `<span class="badge u">zone ?</span>` : q.school==="private" ? `<span class="badge u" style="background:#26303d;color:#9fb6d6">private</span>` : "";
        const b = el(`<button class="place${vis?"":" off"}" role="listitem" aria-pressed="${has}"><span class="box"></span><span class="nm"><span class="t"></span>${badge}<small>${escapeHtml((q.cat||"").replace(/_/g," "))}${vis?"":" · not in this photo"}</small></span><span class="d">${fmtDist(q.dist)}<br>${q.dir}</span></button>`);
        b.querySelector(".t").textContent = q.name; b.onclick = ()=>togglePlace(q.key);
        list.appendChild(b);
      }
    }
    s3.querySelector("#plCount").textContent = `${on} on photo`;
    const cl = p.pins.filter(x=>x.clash && !x.house).map(x=>x.name);
    if (cl.length) s3.appendChild(el(`<p class="warn">Labels overlap: ${escapeHtml(cl.join(", "))}. Untick one, or drag a pin to a clear spot. The finals never have overlapping labels.</p>`));
    fi.oninput = ()=>{ placeFilter = fi.value; const pos = fi.selectionStart; refreshPinsTab(); const n=$("plFilter"); n.focus(); n.setSelectionRange(pos,pos); };
    s3.appendChild(list);
    const ar = el(`<div class="row"><button class="btn wide" id="plRe">Re-place pins</button><button class="btn ghost" id="plClear" style="color:var(--danger)">Clear pins</button></div>`);
    ar.querySelector("#plRe").disabled = !(p.cam && p.cam.ready);
    ar.querySelector("#plRe").onclick = ()=>{ commit(); placePins(p, false); refreshAll(); };
    ar.querySelector("#plClear").onclick = ()=>{ if(!p.pins.length) return; commit(); p.pins=[]; sel=null; refreshAll(); toast("Pins cleared. Undo brings them back."); };
    s3.appendChild(ar);
    s3.appendChild(el(`<p class="note">Our finals use 2–5 pins per photo: the house, plus the places buyers care about that are actually in the shot.</p>`));
    box.appendChild(s3);
  }
  // style
  const s4 = el(`<section class="sec"><h2><span>Agency look</span></h2></section>`);
  const ar2 = el(`<div class="row"><label class="lbl" for="agSel">Agency</label><select id="agSel"></select></div>`);
  const asel = ar2.querySelector("select");
  Object.entries(AGENCIES).forEach(([k,a])=>{ const o=document.createElement("option"); o.value=k; o.textContent=a.name; asel.appendChild(o); });
  Object.keys(templates).sort().forEach(n=>{ const o=document.createElement("option"); o.value="tpl:"+n; o.textContent=n+" (saved)"; asel.appendChild(o); });
  asel.value = LS.get("tpl","") ? "tpl:"+LS.get("tpl","") : prefs.agency;
  asel.onchange = ev=>{ const v = ev.target.value;
    if (v.startsWith("tpl:")){ const n=v.slice(4); LS.set("tpl", n); Object.assign(prefs, templates[n]); }
    else { LS.set("tpl",""); prefs.agency = v; prefs.pinColor = ""; prefs.logo = ""; prefs.houseStyle = ""; }
    savePrefs(); const q=P(); if(q) tidySides(q); refreshPinsTab(); requestDraw(); };
  s4.appendChild(ar2);
  s4.appendChild(el(`<p class="note">Each agency's look is copied from the editors' finals. Pick the agent's agency before placing pins.</p>`));
  const hr = el(`<div class="row"><label class="lbl" for="hsSel">House pin</label><select id="hsSel"></select></div>`);
  Object.entries(HOUSE_STYLES).forEach(([k,v])=>{ const o=document.createElement("option"); o.value=k; o.textContent=v.name; hr.querySelector("select").appendChild(o); });
  hr.querySelector("select").value = prefs.houseStyle||"";
  hr.querySelector("select").onchange = ev=>{ prefs.houseStyle = ev.target.value; savePrefs(); const q=P(); if(q) tidySides(q); requestDraw(); };
  s4.appendChild(hr);
  const lr = el(`<div class="row"><label class="lbl">House mark</label><button class="btn wide" id="logoBtn">${prefs.logo ? "Change logo" : "Use a different logo / photo"}</button>${prefs.logo ? `<button class="btn ghost" id="logoX" style="flex:none">Reset</button>` : ""}</div>`);
  lr.querySelector("#logoBtn").onclick = ()=>$("logoIn").click();
  const lx = lr.querySelector("#logoX"); if (lx) lx.onclick = ()=>{ prefs.logo=""; savePrefs(); refreshPinsTab(); requestDraw(); };
  s4.appendChild(lr);
  const cr = el(`<div class="row"><label class="lbl" for="pinCol">Colour</label><input type="color" id="pinCol" value="${pinColour()}"></div>`);
  cr.querySelector("input").oninput = ev=>{ prefs.pinColor = ev.target.value; savePrefs(); requestDraw(); };
  s4.appendChild(cr);
  s4.appendChild(slider("pinScale","Size",60,160,5,prefs.pinScale,v=>v+"%",v=>{ prefs.pinScale=v; savePrefs(); const q=P(); if(q) tidySides(q); requestDraw(); }));
  const sv = el(`<div class="row"><input type="text" id="tplName" placeholder="Save as a new agency, e.g. Ray White Belmont"><button class="btn" style="flex:none">Save</button></div>`);
  sv.querySelector("button").onclick = ()=>{ const n = sv.querySelector("input").value.trim(); if (!n){ toast("Type the agency name first"); return; } templates[n] = { agency:prefs.agency, houseStyle:prefs.houseStyle||"", pinColor:prefs.pinColor, pinScale:prefs.pinScale, labelOpacity:prefs.labelOpacity, logo:prefs.logo }; try{ LS.set("templates", templates); }catch(e){} LS.set("tpl", n); refreshPinsTab(); toast(`Saved "${n}"`); };
  s4.appendChild(sv);
  box.insertBefore(s4, box.children[1] || null);
}

// ================= Boundary tab =================
function refreshBoundaryTab(){
  const box = tabs.boundary; box.innerHTML = ""; const p = P();
  const s0 = el(`<section class="sec"><h2><span>Lot boundary</span></h2></section>`);
  if (!p){ box.appendChild(s0); return; }
  const b = el(`<div class="row"><button class="btn primary wide">Draw boundary</button><button class="btn">Add line</button></div>`);
  b.children[0].onclick=()=>setTool("poly"); b.children[1].onclick=()=>setTool("line");
  s0.appendChild(b);
  s0.appendChild(el(`<p class="note">Use the straight-down photo. Click each lot corner, then click the first corner to close.</p>`));
  box.appendChild(s0);
  const polys = p.shapes.filter(x=>x.type==="poly");
  const sh = sel && sel.kind==="shape" ? p.shapes.find(x=>x.id===sel.id) : polys[0];
  if (sh && sh.type==="poly"){ if (!sel){ sel={kind:"shape", id:sh.id}; requestDraw(); } box.appendChild(fixSection(p, sh)); }
  if (sh) box.appendChild(shapeSection(p, sh));
  const s2 = el(`<section class="sec"><h2><span>Outside the lot</span></h2></section>`);
  s2.appendChild(el(`<p class="note">Always blurred outside the lot.</p>`));
  s2.appendChild(slider("blurAmt","Blur",35,120,2,Math.max(35,p.blurAmt||45),v=>v,v=>{ p.blurAmt=v; prefs.blurAmt=v; savePrefs(); p._blur=null; requestDraw(); }, commit));
  box.appendChild(s2);
  const s3 = el(`<section class="sec"><h2><span>Disclaimer</span></h2></section>`);
  const dc = el(`<label class="check"><input type="checkbox" ${p.disc.on?"checked":""}> Show on photos with a boundary</label>`);
  dc.querySelector("input").onchange = ev=>{ commit(); p.disc.on = ev.target.checked; prefs.discOn = p.disc.on; savePrefs(); requestDraw(); };
  const dt = el(`<textarea id="discText" aria-label="Disclaimer wording"></textarea>`); dt.value = p.disc.text;
  dt.onfocus=()=>commit(); dt.oninput=()=>{ p.disc.text=dt.value; prefs.discText=dt.value; savePrefs(); requestDraw(); };
  s3.appendChild(dc); s3.appendChild(dt);
  box.appendChild(s3);
  const s4 = el(`<section class="sec"><h2><span>On this photo</span></h2><div class="layers" id="layers"></div></section>`);
  box.appendChild(s4); refreshLayers();
}
const LINK_M = 0.201168;
function shapeSection(p, sh){
  const name = sh.type==="poly" ? "This boundary" : "This line";
  const s = el(`<section class="sec"><h2><span>${name}</span><span class="note">${sh.pts.length} corners</span></h2></section>`);
  const cr = el(`<div class="row"><label class="lbl">Line</label><input type="color" value="${sh.color}"><button class="btn ghost" style="height:26px;font-size:12px">Baker red</button></div>`);
  cr.querySelector("input").onpointerdown=()=>commit();
  cr.querySelector("input").oninput = ev=>{ sh.color = ev.target.value; prefs.lineColor = sh.color; savePrefs(); requestDraw(); };
  cr.querySelector("button").onclick = ()=>{ commit(); sh.color = BAKER_RED; prefs.lineColor = BAKER_RED; savePrefs(); refreshBoundaryTab(); requestDraw(); };
  s.appendChild(cr);
  s.appendChild(slider("shW","Thickness",2,14,0.1,sh.width,v=>v.toFixed(1),v=>{ sh.width=v; prefs.lineWidth=v; savePrefs(); requestDraw(); }, commit));
  if (sh.type!=="poly"){ s.appendChild(delRow(sh)); return s; }
  // lot size
  const area = p.texts.find(t=>t.link===sh.id);
  const ar = el(`<div class="row"><label class="lbl" for="lotSize">Lot size</label><input type="text" id="lotSize" inputmode="decimal" placeholder="from the title, e.g. 769"><span class="val" style="width:auto">m²</span></div>`);
  ar.querySelector("input").value = area && area.lot ? area.lot : "";
  ar.querySelector("input").onchange = ev=>{
    const v = ev.target.value.replace(/m²|m2|sqm/ig,"").trim(); commit();
    let t = p.texts.find(x=>x.link===sh.id);
    if (!v){ if (t) p.texts = p.texts.filter(x=>x!==t); }
    else { if (!t){ t = { id:nid(), link:sh.id, style:"area", color:"#ffffff", size:200, x:0, y:0, autoSize:true }; p.texts.push(t); } t.lot = v; t.text = `${v}m²`; }
    refreshBoundaryTab(); requestDraw();
  };
  s.appendChild(ar);
  // edge lengths
  if (!sh.lens || sh.lens.length !== edgesOf(sh).length) sh.lens = edgesOf(sh).map((_,i)=>(sh.lens&&sh.lens[i])||"");
  const sl = el(`<label class="check"><input type="checkbox" ${sh.showLens?"checked":""}> Show side lengths</label>`);
  sl.querySelector("input").onchange = ev=>{ commit(); sh.showLens = ev.target.checked; requestDraw(); };
  s.appendChild(sl);
  const grid = el(`<div class="edges"></div>`);
  edgesOf(sh).forEach((e,i)=>{
    grid.appendChild(el(`<span>Side ${i+1}</span>`));
    const inp = el(`<input type="text" inputmode="decimal" placeholder="e.g. 17.1m">`); inp.value = sh.lens[i]||"";
    inp.onfocus=()=>{ sel={kind:"shape", id:sh.id, edge:i}; requestDraw(); };
    inp.onchange = ()=>{ commit(); let v = inp.value.trim(); if (v && /^[\d.]+$/.test(v)) v += "m"; sh.lens[i] = v; refreshBoundaryTab(); requestDraw(); };
    grid.appendChild(inp);
    const ds = el(`<button class="btn ghost" style="height:26px;padding:0 7px;font-size:11px" title="Solid or dashed">${sh.dashed[i]?"dashed":"solid"}</button>`);
    ds.onclick = ()=>{ commit(); sh.dashed[i] = !sh.dashed[i]; refreshBoundaryTab(); requestDraw(); };
    grid.appendChild(ds);
  });
  s.appendChild(grid);
  const chk = lengthCheck(p, sh, area);
  if (chk) s.appendChild(chk);
  s.appendChild(el(`<p class="note">Copy lengths from the Certificate of Title. Old titles (before about 1974) are in <b>links</b>, not metres.</p>`));
  s.appendChild(delRow(sh));
  return s;
}
function num(v){ const m = String(v||"").match(/[\d.]+/); return m ? parseFloat(m[0]) : NaN; }
// Catches the mistake in our 10 George St final: title lengths in links shown as metres.
function lengthCheck(p, sh, area){
  const edges = edgesOf(sh), vals = sh.lens.map(num);
  const have = vals.map((v,i)=>({ v, px: dist(edges[i][0], edges[i][1]) })).filter(o=>isFinite(o.v) && o.v>0 && o.px>5);
  if (have.length < 2) return null;
  const ratios = have.map(o=>o.v/o.px).sort((a,b)=>a-b), med = ratios[ratios.length>>1];
  const spread = Math.max(...ratios)/Math.min(...ratios);
  const box = el(`<div class="warn"></div>`);
  let warn = false;
  if (spread > 1.35){ warn = true; box.appendChild(el(`<div>The side lengths don't match the shape you drew (one side looks ${spread.toFixed(1)}× off). Check each side's number and that the corners are on the lot.</div>`)); }
  const lot = area ? num(area.lot) : NaN;
  if (isFinite(lot) && lot > 0){
    const est = polyArea(sh.pts) * med * med, r = est/lot;
    if (r > 15 && r < 40){
      warn = true;
      box.appendChild(el(`<div>These lengths give about <b>${Math.round(est).toLocaleString()} m²</b>, but the lot is <b>${lot} m²</b>. That's what you get when lengths in <b>links</b> are shown as metres (1 link = 0.2012 m).</div>`));
      const b = el(`<button class="btn" style="align-self:flex-start">Convert links to metres</button>`);
      b.onclick = ()=>{ commit(); sh.lens = sh.lens.map(v=>{ const n = num(v); return isFinite(n) ? (n*LINK_M).toFixed(1)+"m" : v; }); refreshBoundaryTab(); requestDraw(); toast("Side lengths converted to metres"); };
      box.appendChild(b);
    } else if (r > 1.6 || r < 0.6){ warn = true; box.appendChild(el(`<div>The side lengths give about <b>${Math.round(est).toLocaleString()} m²</b>, but the lot size says <b>${lot} m²</b>. One of them is wrong.</div>`)); }
  }
  if (!warn){ const ok = el(`<p class="note good">Side lengths and lot size agree.</p>`); return isFinite(lot) ? ok : null; }
  return box;
}
function delRow(sh){
  const r = el(`<div class="row"><button class="btn wide">Duplicate</button><button class="btn wide" style="color:var(--danger)">Delete</button></div>`);
  r.children[0].onclick=()=>{ const p=P(); commit(); const k=12*p.w/1000; const c=JSON.parse(JSON.stringify(sh)); c.id=nid(); c.pts=c.pts.map(q=>[q[0]+k,q[1]+k]); p.shapes.push(c); sel={kind:"shape",id:c.id}; refreshAll(); };
  r.children[1].onclick=()=>{ sel={kind:"shape", id:sh.id}; deleteSelection(); };
  return r;
}
function refreshLayers(){
  const p=P(), box=$("layers"); if (!box) return; box.innerHTML="";
  if (!p) return;
  const items = [];
  p.pins.forEach(pn=>items.push({ kind:"pin", id:pn.id, color:pinColour(), name:pn.house?"House pin":pn.name, meta:"pin" }));
  let bi=0, li=0;
  p.shapes.forEach(s=>items.push({ kind:"shape", id:s.id, color:s.color, name: s.type==="poly" ? `Boundary ${++bi}` : `Line ${++li}`, meta:`${s.pts.length} pts` }));
  p.texts.forEach(t=>items.push({ kind:"text", id:t.id, color:"#fff", name:`“${(t.text||"").split("\n")[0].slice(0,26)}”`, meta:t.style==="area"?"lot size":"text" }));
  if (!items.length){ box.appendChild(el(`<p class="note">Nothing on this photo yet.</p>`)); return; }
  items.forEach(it=>{ const b = el(`<button class="layer" aria-current="${!!(sel&&sel.id===it.id)}"><i style="background:${it.color}"></i><span></span><small>${it.meta}</small></button>`); b.querySelector("span").textContent = it.name; b.onclick=()=>{ sel={kind:it.kind, id:it.id}; setTool("select"); refreshPanel(); refreshLayers(); requestDraw(); }; box.appendChild(b); });
}

// ================= Photo tab =================
function refreshPhotoTab(){
  const box = tabs.photo; box.innerHTML = ""; const p = P();
  const s1 = el(`<section class="sec"><h2><span>Baker finish</span></h2></section>`);
  if (!p){ box.appendChild(s1); return; }
  if (p.sample){ s1.appendChild(el(`<p class="note">The finish is off for the sample. Add a real drone photo to see it.</p>`)); box.appendChild(s1); }
  else {
    const f = el(`<label class="check"><input type="checkbox" ${p.finishOn?"checked":""}> Colour, contrast and sharpening</label>`);
    f.querySelector("input").onchange = ev=>{ commit(); p.finishOn = ev.target.checked; prefs.finish = p.finishOn; savePrefs(); ensureFinish(p); refreshStrip(); requestDraw(); };
    const sk = el(`<label class="check"><input type="checkbox" ${p.skyOn?"checked":""} ${p.finishOn?"":"disabled"}> Replace the sky</label>`);
    sk.querySelector("input").onchange = ev=>{ commit(); p.skyOn = ev.target.checked; p.finKey = null; prefs.sky = p.skyOn; savePrefs(); ensureFinish(p); requestDraw(); };

    s1.appendChild(f); s1.appendChild(sk);
    { const sr = el(`<div class="row"><label class="lbl">Sky</label><select></select></div>`), ss = sr.querySelector("select");
      Object.entries(SKY_PLATES).forEach(([k,v])=>{ const o=document.createElement("option"); o.value=k; o.textContent=v.name+(k==="C"?" (default)":""); ss.appendChild(o); });
      ss.value = prefs.skyPlate || "C"; ss.disabled = !p.skyOn;
      ss.onchange = ev=>{ commit(); prefs.skyPlate = ev.target.value; savePrefs(); loadSkyPlate(prefs.skyPlate, ()=>{ photos.forEach(q=>{ q.finKey=null; q.fin=null; }); ensureFinish(p); requestDraw(); }); };
      s1.appendChild(sr); }
    s1.appendChild(el(`<p class="note">Learned from our delivered aerials: brighter midtones, about 25% more colour, crisper detail, and the clean blue sky our editor uses. Hold <b>Hold for before</b> (or the \\ key) to compare.</p>`));
    box.appendChild(s1);
  }
  if (!p.sample){
    if (!p.adj) p.adj = Object.assign({}, ADJ0);
    const sa = el(`<section class="sec"><h2><span>Adjust photo</span></h2></section>`);
    sa.appendChild(el(`<p class="note">Changes the picture only. Pins, boundary lines and text stay exactly as they are.</p>`));
    const A = [["exp","Brightness"],["con","Contrast"],["hl","Highlights"],["sh","Shadows"],["warm","Warmth"],["tint","Tint"],["sat","Colour"]];
    let tm=null; const redraw=()=>{ clearTimeout(tm); tm=setTimeout(()=>{ p._blur=null; refreshStrip(); requestDraw(); }, 60); };
    A.forEach(([k,lab])=>sa.appendChild(slider("adj_"+k, lab, -100, 100, 1, p.adj[k]||0, v=>(v>0?"+":"")+v, v=>{ p.adj[k]=v; redraw(); }, commit)));
    const rb = el(`<div class="row"><button class="btn">Reset</button><button class="btn">Copy to all photos</button></div>`);
    rb.children[0].onclick=()=>{ commit(); p.adj=Object.assign({}, ADJ0); p._blur=null; refreshPhotoTab(); refreshStrip(); requestDraw(); };
    rb.children[1].onclick=()=>{ photos.forEach(q=>{ if (q!==p && !q.sample){ q.adj=Object.assign({}, p.adj); q._blur=null; } }); toast(`Copied to ${photos.length-1} other photo${photos.length===2?"":"s"}`); refreshStrip(); };
    sa.appendChild(rb); box.appendChild(sa);
    const sp = el(`<section class="sec"><h2><span>Project</span></h2></section>`);
    sp.appendChild(el(`<p class="note">Save the whole job (pins, boundaries, text, adjustments) to reopen later. To reopen: add the same photos, then the project file.</p>`));
    const pb = el(`<div class="row"><button class="btn">Save project</button></div>`);
    pb.children[0].onclick=()=>{ const b=new Blob([projectJSON()],{type:"application/json"}); deliver(b, (job&&job.name?String(job.name).replace(/[^\w]+/g,"_"):"aerials")+".baker.json"); };
    sp.appendChild(pb); box.appendChild(sp);
  }
  const s2 = el(`<section class="sec"><h2><span>Size</span></h2></section>`);
  s2.appendChild(el(`<dl class="note" style="margin:0">${p.w} × ${p.h} px${p.k<1 ? ` · cropped 3:2 from ${p.ow} × ${p.oh}` : ""}</dl>`));
  const seg = el(`<div class="seg"><button data-v="finals">3000 × 2000 (finals)</button><button data-v="full">Full size</button></div>`);
  seg.querySelectorAll("button").forEach(bt=>{ bt.setAttribute("aria-pressed", prefs.outMode===bt.dataset.v); bt.onclick=()=>{ prefs.outMode=bt.dataset.v; savePrefs(); refreshPhotoTab(); toast("Applies to photos you add from now on"); }; });
  s2.appendChild(seg);
  s2.appendChild(el(`<p class="note">Our delivered aerials are 3:2, 3000 px wide. Exports keep the original file name, like the finals.</p>`));
  box.appendChild(s2);
}

// ================= selection panels =================
const selSec = $("selSec");
function refreshPanel(){
  const p=P(); selSec.innerHTML=""; selSec.hidden = true;
  if (!p || !sel) return;
  if (sel.kind==="pin"){ const pin = p.pins.find(x=>x.id===sel.id); if (pin){ selSec.hidden=false; pinPanel(p, pin); } }
  else if (sel.kind==="text"){ const t = p.texts.find(x=>x.id===sel.id); if (t){ selSec.hidden=false; textPanel(p, t); } }
  else if (sel.kind==="shape" && ptab!=="boundary"){ setTab("boundary"); return; }
  refreshLayers();
}
function pinPanel(p, pin){
  selSec.appendChild(el(`<h2><span>${pin.house?"House pin":"Pin"}</span><button class="btn ghost" id="pnDone" style="height:24px;padding:0 8px;font-size:11px">Done</button></h2>`));
  selSec.querySelector("#pnDone").onclick=()=>{ sel=null; refreshPanel(); requestDraw(); };
  if (!pin.house){
    const nr = el(`<div class="row"><label class="lbl" for="pnName">Label</label><input type="text" id="pnName"></div>`);
    const ni = nr.querySelector("input"); ni.value = pin.name; ni.onfocus=()=>commit(); ni.oninput=()=>{ pin.name=ni.value; requestDraw(); };
    selSec.appendChild(nr);
    const ir = el(`<div class="row"><label class="lbl" for="pnIcon">Icon</label><select id="pnIcon">${ICON_CHOICES.map(([k,n])=>`<option value="${k}">${n}</option>`).join("")}</select></div>`);
    ir.querySelector("select").value = pin.icon||"star"; ir.querySelector("select").onchange = ev=>{ commit(); pin.icon = ev.target.value; requestDraw(); };
    selSec.appendChild(ir);
    const fr = el(`<div class="row"><label class="lbl">Points</label><div class="seg"><button data-v="down">Down</button><button data-v="up">Up</button></div></div>`);
    fr.querySelectorAll("button").forEach(b=>{ b.setAttribute("aria-pressed", (!!pin.flip)===(b.dataset.v==="up")); b.onclick=()=>{ commit(); pin.flip = b.dataset.v==="up"; pin.layoutLocked=true; refreshPanel(); requestDraw(); }; });
    selSec.appendChild(fr);
    const sr = el(`<div class="row"><label class="lbl">Label side</label><div class="seg"><button data-v="left">Left</button><button data-v="top">Above</button><button data-v="bottom">Below</button><button data-v="right">Right</button></div></div>`);
    sr.querySelectorAll("button").forEach(b=>{ b.setAttribute("aria-pressed", pin.side===b.dataset.v); b.onclick=()=>{ commit(); pin.side=b.dataset.v; pin.sideLocked=true; refreshPanel(); requestDraw(); }; });
    selSec.appendChild(sr);
  }
  const q = pin.key ? placeForKey(pin.key) : null;
  if (q) selSec.appendChild(el(`<p class="note">${escapeHtml((q.cat||"").replace(/_/g," "))} · ${fmtDist(q.dist)} ${q.dir}${q.desc ? " · "+escapeHtml(q.desc) : ""}</p>`));
  if (!pin.house){
    if (agency().kind !== "pin") selSec.appendChild(slider("pnLift","Lift",0,800,5,Math.round(pin.lift||0),v=>v,v=>{ pin.lift=v; pin.layoutLocked=true; requestDraw(); }, commit));
    const al = el(`<button class="btn ghost" style="align-self:flex-start;height:26px;font-size:12px">Auto layout all pins</button>`);
    al.onclick=()=>{ commit(); p.pins.forEach(x=>{ x.layoutLocked=false; x.sideLocked=false; }); tidySides(p); refreshPanel(); requestDraw(); };
    selSec.appendChild(al);
  }
  selSec.appendChild(el(`<p class="note">Drag the pin so its point sits on the place. Crowded pins rise on a stem; the dot marks the exact spot.</p>`));
  const br = el(`<div class="row"><button class="btn wide" id="pnSnap">Back to auto spot</button><button class="btn wide" id="pnDel" style="color:var(--danger)">Delete pin</button></div>`);
  const ll = pin.house ? job : q; const at = ll ? autoPoint(p, ll.lat, ll.lng) : null;
  br.querySelector("#pnSnap").disabled = !at;
  br.querySelector("#pnSnap").onclick=()=>{ commit(); pin.ex=at[0]; pin.ey=at[1]; pin.moved=false; requestDraw(); };
  br.querySelector("#pnDel").onclick=deleteSelection;
  selSec.appendChild(br);
}
function textPanel(p, t){
  selSec.appendChild(el(`<h2><span>${t.style==="area"?"Lot size text":"Text"}</span><button class="btn ghost" id="txDone" style="height:24px;padding:0 8px;font-size:11px">Done</button></h2>`));
  selSec.querySelector("#txDone").onclick=()=>{ sel=null; refreshPanel(); requestDraw(); };
  const ta = el(`<textarea id="tText" aria-label="Text"></textarea>`); ta.value = t.text;
  ta.onfocus=()=>commit(); ta.oninput=()=>{ t.text=ta.value; requestDraw(); refreshLayers(); };
  selSec.appendChild(ta);
  if (t.style==="area"){
    const a = el(`<label class="check"><input type="checkbox" ${t.autoSize!==false?"checked":""}> Size and centre to the lot</label>`);
    a.querySelector("input").onchange = ev=>{ commit(); t.autoSize = ev.target.checked; if (t.autoSize) t.moved=false; refreshPanel(); requestDraw(); };
    selSec.appendChild(a);
  }
  if (t.style!=="area" || t.autoSize===false) selSec.appendChild(slider("tSize","Size",14,600,1,t.size,v=>v,v=>{ t.size=v; requestDraw(); }, commit));
  if (t.style!=="area"){
    const st = el(`<div class="row"><label class="lbl">Style</label><div class="seg"><button data-s="shadow">White</button><button data-s="pill">White box</button></div></div>`);
    st.querySelectorAll("button").forEach(b=>{ b.setAttribute("aria-pressed", t.style===b.dataset.s); b.onclick=()=>{ commit(); t.style=b.dataset.s; t.color = t.style==="pill" ? "#111111" : "#ffffff"; refreshPanel(); requestDraw(); }; });
    selSec.appendChild(st);
  }
  const dr = el(`<button class="btn" style="color:var(--danger)">Delete text</button>`); dr.onclick=deleteSelection; selSec.appendChild(dr);
}

// ================= photos strip =================
function makeThumb(p){ const src = (p.finishOn && p.fin) ? p.fin : p.base; const c=document.createElement("canvas"); const h=120; c.height=h; c.width=Math.round(p.w/p.h*h); c.getContext("2d").drawImage(src,0,0,c.width,c.height); try{ p.thumb=c.toDataURL("image/jpeg",.7); }catch(e){ p.thumb=""; } }
function photoReady(p){ return p.pins.length>0 || p.shapes.length>0; }
function refreshStrip(){
  const s=$("strip"); s.innerHTML="";
  photos.forEach((p,i)=>{
    const b = el(`<div class="thumb" role="button" tabindex="0" aria-current="${i===cur}"><img alt=""><span class="n">${i+1}</span><span class="st${photoReady(p)?" ok":""}" title="${photoReady(p)?"Has graphics":"No graphics yet"}"></span><button class="x" aria-label="Remove photo">×</button></div>`);
    b.title = p.name; b.querySelector("img").src=p.thumb;
    b.onclick=ev=>{ if (ev.target.classList.contains("x")) return; selectPhoto(i); };
    b.onkeydown=ev=>{ if (ev.key==="Enter") selectPhoto(i); };
    b.querySelector(".x").onclick=()=>removePhoto(i);
    s.appendChild(b);
  });
  const add = el(`<button class="addthumb">+ Add</button>`); add.onclick=()=>$("fileIn").click(); s.appendChild(add);
  $("exportAllBtn").disabled = photos.length<2; $("exportBtn").disabled = !photos.length;
}
function selectPhoto(i){ if (draft) cancelDraft(); armed=null; cur=i; sel=null; $("sampleTag").hidden = !(P()&&P().sample); ensureFinish(P()); refreshAll(); fit(); }
function removePhoto(i){ photos.splice(i,1); if (!photos.length){ cur=-1; refreshAll(); return; } selectPhoto(Math.min(cur>i?cur-1:cur, photos.length-1)); }

// ================= import =================
async function decodeToWorking(file){
  let bmp;
  try { bmp = await createImageBitmap(file); }
  catch(e){ bmp = await new Promise((res,rej)=>{ const im=new Image(); im.onload=()=>res(im); im.onerror=rej; im.src=URL.createObjectURL(file); }); }
  const ow = bmp.width, oh = bmp.height;
  let x0=0, y0=0, cw=ow, ch=oh;
  if (prefs.outMode === "finals"){
    if (ow/oh > 1.5){ cw = Math.round(oh*1.5); x0 = Math.round((ow-cw)/2); }
    else if (ow/oh < 1.5 && ow>=oh){ ch = Math.round(ow/1.5); y0 = Math.round((oh-ch)/2); }
  }
  const tw = prefs.outMode === "finals" ? Math.min(3000, cw) : cw;
  const k = tw/cw, th = Math.round(ch*k);
  // step down in halves for a clean downscale
  let src = bmp, sx=x0, sy=y0, sw=cw, sh=ch;
  while (tw < sw/2.2){
    const c = document.createElement("canvas"); c.width = Math.round(sw/2); c.height = Math.round(sh/2);
    const cx = c.getContext("2d"); cx.imageSmoothingQuality="high"; cx.drawImage(src, sx, sy, sw, sh, 0, 0, c.width, c.height);
    src = c; sx=0; sy=0; sw=c.width; sh=c.height;
  }
  const out = document.createElement("canvas"); out.width = tw; out.height = th;
  const ox = out.getContext("2d"); ox.imageSmoothingQuality="high"; ox.drawImage(src, sx, sy, sw, sh, 0, 0, tw, th);
  if (bmp.close) bmp.close();
  return { canvas:out, ow, oh, x0, y0, k };
}
const fileIn = $("fileIn");
$("addBtn").onclick=()=>fileIn.click();
fileIn.onchange=()=>{ addFiles([...fileIn.files]); fileIn.value=""; };
function projectJSON(){ return JSON.stringify({ bakerProject:1, saved:new Date().toISOString(), job: job||null, agency: prefs.agency, photos: photos.filter(q=>!q.sample).map(q=>{ const o={ name:q.name }; SNAP_KEYS.forEach(k=>o[k]=q[k]); return o; }) }); }
let pendingProject = null;
function applyProject(){ if (!pendingProject) return 0; let n=0;
  photos.forEach(q=>{ const s = pendingProject.photos.find(o=>o.name===q.name); if (!s) return; SNAP_KEYS.forEach(k=>{ if (s[k]!==undefined) q[k]=JSON.parse(JSON.stringify(s[k])); }); q.fin=null; q.finKey=null; q._blur=null; q._adj=null; ensureFinish(q); n++; });
  return n; }
async function addFiles(files){
  const pf = []; for (const f of files){ if (/\.json$/i.test(f.name)){ try{ const o=JSON.parse(await f.text()); if (o && o.bakerProject){ pendingProject=o; if (o.job) job=o.job; if (o.agency) { prefs.agency=o.agency; savePrefs(); } pf.push(f); } }catch(e){} } }
  files = files.filter(f=>!pf.includes(f));
  if (pf.length && !files.length){ const n=applyProject(); refreshAll(); toast(n ? `Project restored on ${n} photo${n>1?"s":""}` : "Project loaded. Now add its photos."); return; }
  const jf = files.find(f=>/\.(json|html?)$/i.test(f.name)); if (jf) await loadJobFile(jf);
  const imgs = files.filter(f=>/^image\//.test(f.type) || /\.(jpe?g|png|webp)$/i.test(f.name));
  if (!imgs.length){ if (!jf) toast("Those files aren't photos. Use JPG, PNG or WebP."); return; }
  const hadSample = photos.length===1 && photos[0].sample;
  if (hadSample){ photos = []; if (job && job.sample) job = null; }
  const first = photos.length;
  $("busy").hidden = false; $("busy").textContent = `Loading ${imgs.length} photo${imgs.length>1?"s":""}…`;
  for (const f of imgs){
    try{
      const meta = await readDroneMeta(f);
      const d = await decodeToWorking(f);
      const p = newPhoto(f.name, d.canvas, meta, false);
      Object.assign(p, { ow:d.ow, oh:d.oh, x0:d.x0, y0:d.y0, k:d.k, w:d.canvas.width, h:d.canvas.height });
      if (p.cam && !p.cam.fromGimbal){ p.horizon = horizonFor(p); }
      makeThumb(p); photos.push(p);
    }catch(err){ console.error(err); toast(`Couldn't open ${f.name}. RAW/DNG won't load; use the JPG.`); }
  }
  if (pendingProject){ const n=applyProject(); if (n) toast(`Project restored on ${n} photo${n>1?"s":""}`); }
  $("busy").textContent = "Finishing photo…"; $("busy").hidden = !finishing;
  if (photos.length > first){
    selectPhoto(first);
    const nocam = photos.slice(first).filter(p=>!p.cam).length;
    toast(nocam ? `${photos.length-first} added. ${nocam} have no GPS, so their pins are placed by hand.` : job ? `${photos.length-first} added. Click the house on each photo to line it up.` : `${photos.length-first} added. Load the amenity map on the Pins tab.`, 4500);
  }
}
let dragDepth=0; const drop=$("drop");
document.addEventListener("dragenter", e=>{ if ([...(e.dataTransfer?.types||[])].includes("Files")){ dragDepth++; drop.hidden=false; e.preventDefault(); } });
document.addEventListener("dragover", e=>{ if ([...(e.dataTransfer?.types||[])].includes("Files")) e.preventDefault(); });
document.addEventListener("dragleave", ()=>{ dragDepth=Math.max(0,dragDepth-1); if(!dragDepth) drop.hidden=true; });
document.addEventListener("drop", e=>{ e.preventDefault(); dragDepth=0; drop.hidden=true; if (e.dataTransfer?.files?.length) addFiles([...e.dataTransfer.files]); });
document.addEventListener("paste", e=>{ const fs=[...(e.clipboardData?.files||[])]; if (fs.length) addFiles(fs); });
$("logoIn").onchange = ()=>{
  const f = $("logoIn").files[0]; $("logoIn").value=""; if (!f) return;
  const rd = new FileReader(); rd.onload = ()=>{ const im = new Image(); im.onload = ()=>{ // shrink to 400 px so it fits in browser storage
      const k = Math.min(1, 400/Math.max(im.width, im.height)), c = document.createElement("canvas"); c.width = Math.round(im.width*k); c.height = Math.round(im.height*k);
      c.getContext("2d").drawImage(im,0,0,c.width,c.height); prefs.logo = c.toDataURL("image/png"); savePrefs(); refreshPinsTab(); requestDraw(); toast("House mark updated"); };
    im.src = rd.result; }; rd.readAsDataURL(f);
};
$("metaIn").onchange = async ()=>{
  const f = $("metaIn").files[0]; $("metaIn").value=""; const p = P(); if (!f || !p) return;
  const m = await readDroneMeta(f);
  if (!m){ toast("No GPS in that file either. Use the untouched JPG straight off the drone."); return; }
  commit(); p.meta = m; p.cam = makeCam(m); p.anchors = []; if (!p.cam.fromGimbal) p.horizon = horizonFor(p);
  if (p.cam.ready) placePins(p, true);
  refreshAll(); toast(p.cam.fromGimbal ? "Drone heading and tilt loaded." : "GPS loaded. Click the house to line up.");
};

// ================= amenity map =================
function decodeEntities(s){ const t = document.createElement("textarea"); t.innerHTML = s; return t.value; }
function normType(t){ if (!t) return ""; t=String(t).toLowerCase();
  const R=[[/train|station/,"train"],[/regional shopping/,"regional_shopping"],[/shopping|mall|plaza/,"shopping"],[/school|college/,"school"],[/golf/,"golf"],[/library/,"library"],[/aquatic|pool|swim/,"aquatic"],[/hospital/,"hospital"],[/national park|regional park|dam/,"regional_park"],[/beach/,"beach"],[/lake/,"lake"],[/nature reserve|bushland|trail|reserve/,"reserve"],[/botanic|park|oval/,"park"],[/recreation|sport/,"recreation"],[/child|kinder|daycare/,"childcare"],[/playground/,"playground"]];
  for (const [re,c] of R) if (re.test(t)) return c; return "other"; }
function parseJobFile(text){
  let j = null; const tt = text.trim();
  if (tt.startsWith("{")){
    const o = JSON.parse(tt);
    if (typeof o.lat !== "number" || !Array.isArray(o.pins)) throw new Error("This JSON has no property position or pins.");
    j = { address:o.address||"Property", lat:o.lat, lng:o.lng, places:o.pins.map(q=>({ name:q.name, cat:q.cat||"other", lat:q.lat, lng:q.lng, desc:q.desc||"", school:q.school||"" })) };
  } else {
    // both amenity-map generations: "var PROP=[..]; var M=[..]" and "const P=[..], ITEMS=[..]"
    const arrAfter = re => { const m = re.exec(tt); if (!m) return null; let i = m.index + m[0].lastIndexOf("["), d = 0, q = null;
      for (let k=i; k<tt.length; k++){ const ch = tt[k]; if (q){ if (ch === "\\"){ k++; continue; } if (ch === q) q = null; continue; } if (ch === '"' || ch === "'"){ q = ch; continue; } if (ch === "[") d++; else if (ch === "]"){ d--; if (!d) return tt.slice(i, k+1); } } return null; };
    let ps = arrAfter(/\b(?:PROP|P|H)\s*=\s*\[/), ms = arrAfter(/\b(?:M|ITEMS|PINS|PLACES|A|R|pins)\s*=\s*\[\s*\{/);
    if (!ps){ const po = tt.match(/\b(?:PROP|P|H)\s*=\s*(\{[^}]*\})/); if (po){ const o = JSON.parse(po[1]); ps = JSON.stringify([o.lat, o.lng]); } }
    if (!ps || !ms) throw new Error("That file isn't one of our amenity maps.");
    const prop = JSON.parse(ps), M = JSON.parse(ms).map(q=>Object.assign({}, q, { name: q.name || q.n, badge: q.badge || (q.kind==="zoned" ? "ZONED" : q.kind==="unverified" ? "unverified" : q.kind==="private" ? "private" : "") }));
    const am = tt.match(/<div class="addr">([\s\S]*?)<\/div>/) || tt.match(/<title>([^<–-]+?)\s*[–-]/);
    j = { address: am ? decodeEntities(am[1]).trim() : "Property", lat:prop[0], lng:prop[1],
      places: M.map(q=>({ name:decodeEntities(q.name), cat:q.cat||normType(q.type)||(/school|college/i.test(q.name)?"school":/station/i.test(q.name)?"train":/park|reserve/i.test(q.name)?"park":"other"), lat:q.lat, lng:q.lng, desc:decodeEntities((q.notes||"").replace(/^.*?·\s*/,"")), school: /ZONED/.test(q.badge||"") ? "zoned" : /unverified/.test(q.badge||"") ? "unverified" : /private/.test(q.badge||"") ? "private" : "" })) };
  }
  const seen = new Set();
  j.places.forEach(q=>{ if (q.name){ if (/✓\s*ZONED|\bZONED\b/i.test(q.name) && !q.school) q.school='zoned'; q.name = String(q.name).replace(/\s*✓?\s*\(?\bZONED\b\)?\s*/ig,' ').replace(/\s*[✓✔]\s*$/,'').trim(); } });
  j.places = j.places.filter(q=>q.name && isFinite(q.lat) && isFinite(q.lng)).map(q=>{ const g = geoDist(j.lat, j.lng, q.lat, q.lng); let key = q.name.toLowerCase(); while (seen.has(key)) key += "+"; seen.add(key); return Object.assign(q, { key, dist:g.d, dir:g.dir, icon:iconForPlace(q.name, q.cat) }); }).sort((a,b)=>a.dist-b.dist);
  return j;
}
$("jobIn").onchange = async ()=>{ const f = $("jobIn").files[0]; $("jobIn").value=""; if (f) loadJobFile(f); };
async function loadJobFile(f){
  try{ const j = parseJobFile(await f.text()); job = j; armed=null; photos.forEach(p=>{ if (p.anchors.some(a=>a.key==="__house")){ p.anchors.forEach(a=>{ if (a.key==="__house"){ a.lat=j.lat; a.lng=j.lng; } }); realign(p); } }); refreshAll(); toast(`${j.places.length} places loaded for ${j.address.split(",")[0]}`); }
  catch(err){ toast(err.message || "Couldn't read that file"); }
}

// ================= export =================
function baseName(n){ return (n||"photo").replace(/\.[^.]+$/,""); }
async function fontsReady(){ if (!document.fonts) return; try{ await Promise.all([document.fonts.load(`400 40px "Source Sans 3"`), document.fonts.load(`300 40px "Source Sans 3"`), document.fonts.load(`700 40px "Source Sans 3"`)]); }catch(e){} }
function renderFull(p){
  return new Promise(res=>{
    const c=document.createElement("canvas"); c.width=p.w; c.height=p.h;
    const x=c.getContext("2d"); x.imageSmoothingQuality="high";
    const keep = ctx.font; drawScene(x, p, { hide:false }); ctx.font = keep;
    const cr = lotCrop(p);
    if (cr){ const o=document.createElement("canvas"); o.width=3000; o.height=2000; const ox=o.getContext("2d"); ox.imageSmoothingQuality="high"; ox.drawImage(c, cr[0],cr[1],cr[2],cr[3], 0,0,3000,2000); o.toBlob(b=>res(b), "image/jpeg", 0.95); return; }
    c.toBlob(b=>res(b), "image/jpeg", 0.95);
  });
}
let downloads = null;
(async()=>{ try{ downloads = window.claude ? await window.claude.use("downloads") : null; }catch(e){ downloads=null; } })();
async function deliver(blob, filename){
  if (downloads){
    try{ await downloads.save({ filename, data: blob }); toast("Saved "+filename); return; }
    catch(err){ if (err && err.code==="declined"){ toast("Save cancelled"); return; } if (err && err.code==="rate_limited"){ toast("A save is already waiting for you to confirm"); return; } }
  }
  if (!window.claude){ const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),60000); toast("Downloaded "+filename); return; }
  const url = URL.createObjectURL(blob);
  const m = el(`<div class="modal" role="dialog" aria-label="Your export"><div class="card"><div class="row" style="justify-content:space-between"><strong></strong><button class="btn">Close</button></div>${/^image\//.test(blob.type)?`<img alt="Exported photo">`:""}<p class="note">Right-click or long-press the image and choose Save Image.</p></div></div>`);
  m.querySelector("strong").textContent = filename; const im = m.querySelector("img"); if (im) im.src = url;
  m.querySelector("button").onclick=()=>{ m.remove(); URL.revokeObjectURL(url); }; document.body.appendChild(m);
}
function waitFinished(p){ return new Promise(res=>{ const tick=()=>{ if (!p.finishOn || p.sample || (p.fin && !p._finPending)) res(); else setTimeout(tick, 100); }; ensureFinish(p); tick(); }); }
$("exportBtn").onclick = async ()=>{ const p=P(); if(!p) return; await fontsReady(); await waitFinished(p); toast("Rendering…"); const b = await renderFull(p); deliver(b, `${baseName(p.name)}.jpg`); };
$("exportAllBtn").onclick = async ()=>{
  if (!window.JSZip){ toast("ZIP export couldn't load. Export photos one at a time."); return; }
  await fontsReady(); const zip=new JSZip(); const used=new Set();
  for (let i=0;i<photos.length;i++){
    toast(`Rendering ${i+1} of ${photos.length}…`, 10000);
    await waitFinished(photos[i]); const b = await renderFull(photos[i]); if(!b) continue;
    let n = baseName(photos[i].name); while (used.has(n)) n += " ("+(i+1)+")"; used.add(n); zip.file(`${n}.jpg`, b);
  }
  const z = await zip.generateAsync({type:"blob"});
  deliver(z, job ? `${job.address.split(",")[0]} aerials.zip` : `aerials_${new Date().toISOString().slice(0,10)}.zip`);
};

// ================= sample (rendered through a virtual drone camera) =================
function rng(seed){ return ()=>{ seed=(seed*16807)%2147483647; return (seed-1)/2147483646; }; }
function makeSample(){
  const W=3000, H=2000, c=document.createElement("canvas"); c.width=W; c.height=H; const x=c.getContext("2d"); const r=rng(11);
  const PROP = { lat:-31.95120, lng:115.86030 }, c0 = Math.cos(PROP.lat*DEG);
  const ll = (mx,my)=>[PROP.lat + my/111320, PROP.lng + mx/(111320*c0)];
  const camLL = ll(0,-160);
  const cam = { lat:camLL[0], lng:camLL[1], h:70, yaw:0, pitch:-20, roll:0, f35:24, fromGimbal:true, ready:true };
  const pj = (mx,my)=>{ const q = ll(mx,my); return projectOrig(cam, W, H, q[0], q[1]); };
  const poly = (pts, fill)=>{ const q = pts.map(a=>pj(a[0],a[1])); if (q.some(z=>!z)) return; x.beginPath(); q.forEach((z,i)=>i?x.lineTo(z[0],z[1]):x.moveTo(z[0],z[1])); x.closePath(); x.fillStyle=fill; x.fill(); };
  const rect = (x0,y0,x1,y1,fill)=>poly([[x0,y0],[x1,y0],[x1,y1],[x0,y1]], fill);
  const hz = pj(0, 60000)[1];
  let g = x.createLinearGradient(0,0,0,hz); SKY_STOPS.forEach((s,i)=>g.addColorStop(i/(SKY_STOPS.length-1), `rgb(${s})`)); x.fillStyle=g; x.fillRect(0,0,W,hz+2);
  x.fillStyle="#7c8d55"; x.fillRect(0,hz,W,H-hz);
  for (let i=0;i<2600;i++){ const mx=-1600+r()*3200, my=-90+Math.pow(r(),1.7)*3600, s2=5+r()*18; rect(mx,my,mx+s2,my+s2*(.6+r()*.8), `rgba(${55+r()*60|0},${78+r()*50|0},${32+r()*28|0},${.18+r()*.2})`); }
  const NS=[-1000,-620,-260,240,600,1050], EW=[-23,60,150,260,640,900,1200,1550,1950,2500];
  const park=[100,60,230,150], reserve=[-250,260,240,640], school=[-250,150,-60,260], shops=[260,640,600,900];
  const inZone=(mx,my)=>[park,reserve,school,shops].some(z=>mx>z[0]-2&&mx<z[2]+2&&my>z[1]-2&&my<z[3]+2);
  rect(...park,"#6f9a46"); rect(...reserve,"#73944b");
  const lake=[]; for(let i=0;i<40;i++){ const a=i/40*Math.PI*2; lake.push([-120+Math.cos(a)*(190+18*Math.sin(a*3)), 470+Math.sin(a)*(110+10*Math.cos(a*2))]); }
  poly(lake,"#3f6f86"); rect(...school,"#86a05a"); rect(...shops,"#8a8b88"); rect(280,660,450,760,"#c9c6c0");
  EW.forEach(y0=>{ rect(-1600,y0-8.5,1600,y0+8.5,"#a7a397"); rect(-1600,y0-6,1600,y0+6,"#4b4d50"); });
  NS.forEach(x0=>{ rect(x0-8.5,-90,x0+8.5,3800,"#a7a397"); rect(x0-6,-90,x0+6,3800,"#4b4d50"); });
  rect(812,-90,828,3800,"#8a8378"); rect(800,1460,840,1540,"#c9c4b8");
  const items=[];
  EW.forEach(y0=>{ [1,-1].forEach(side=>{ for (let mx=-1600+9; mx<1600; mx+=18){
    const ya = side>0 ? y0+7 : y0-39, yb = ya+32, cx = mx+9;
    if (NS.some(n=>Math.abs(cx-n)<16) || Math.abs(cx-820)<20 || inZone(cx,(ya+yb)/2) || inZone(cx,ya) || inZone(cx,yb)) continue;
    if (EW.some(o=>o!==y0 && ya<o+8 && yb>o-8)) continue;
    items.push({ y:(ya+yb)/2, draw:()=>{
      const subj = Math.abs(cx)<1 && side>0 && y0===-23;
      rect(mx,ya,mx+18,yb, subj ? "#86a454" : `rgb(${108+r()*22|0},${132+r()*20|0},${74+r()*14|0})`);
      const front = side>0 ? ya+5 : yb-19, hx0 = mx+2.5+r()*1.5, hx1 = mx+15.5-r()*1.5;
      rect(hx0+.7,front+.8,hx1+.7,front+14.8,"rgba(0,0,0,.25)");
      const roof = r()<.5 ? ["#9a5537","#b26a48"] : r()<.5 ? ["#5b6168","#727a82"] : ["#bdb7aa","#d2cdc1"];
      rect(hx0,front,hx1,front+14,roof[0]); rect(hx0,front,hx1,front+7,roof[1]);
      if (subj || r()<.28){ const py = side>0 ? yb-8 : ya+2; rect(mx+4,py,mx+10,py+4,"#e8e4da"); rect(mx+4.6,py+.6,mx+9.4,py+3.4,"#33a6cf"); }
    }});
    if (r()<.7){ const tx=mx+2+r()*14, ty= side>0 ? yb-2-r()*8 : ya+2+r()*8; items.push({ y:ty, tree:[tx,ty,2.5+r()*3] }); }
  } }); });
  for (let i=0;i<70;i++) items.push({ y:0, tree:[park[0]+r()*(park[2]-park[0]), park[1]+r()*(park[3]-park[1]), 3+r()*4] });
  items.forEach(it=>{ if (it.tree) it.y = it.tree[1]; });
  items.sort((a,b)=>b.y-a.y).forEach(it=>{ if (it.draw) return it.draw(); const [tx,ty,tr]=it.tree, q=pj(tx,ty), q2=pj(tx+tr,ty); if(!q||!q2) return; const rad=Math.abs(q2[0]-q[0]); if (rad<.6) return; const gg=x.createRadialGradient(q[0]-rad*.35,q[1]-rad*.5,rad*.1,q[0],q[1]-rad*.25,rad*1.1); gg.addColorStop(0,"#6f9a44"); gg.addColorStop(1,"#26431f"); x.fillStyle=gg; x.beginPath(); x.ellipse(q[0],q[1]-rad*.3,rad,rad*.8,0,0,7); x.fill(); });
  g = x.createLinearGradient(0,hz,0,hz+H*.3); g.addColorStop(0,"rgba(214,224,229,.8)"); g.addColorStop(1,"rgba(214,224,229,0)"); x.fillStyle=g; x.fillRect(0,hz,W,H*.3);
  const p = newPhoto("Sample aerial.jpg", c, { lat:cam.lat, lng:cam.lng, f35:24, gimbal:{ h:cam.h, yaw:0, pitch:-20, roll:0 } }, true);
  const L = (name, cat, mx, my, school) => { const q = ll(mx,my); return { name, cat, lat:q[0], lng:q[1], desc:"", school:school||"" }; };
  const sj = { address:"12 Sample Street, Perthville WA 6000, Australia", lat:PROP.lat, lng:PROP.lng, sample:true, places:[
    L("Sample Lake Reserve","lake",-120,470), L("Sample Park","park",165,105), L("Sample Primary School","school",-155,205,"zoned"),
    L("Sample Shopping Centre","shopping",425,775), L("Sample Station","train",820,1500) ]};
  sj.places = sj.places.map(q=>{ const gd = geoDist(sj.lat, sj.lng, q.lat, q.lng); return Object.assign(q,{ key:q.name.toLowerCase(), dist:gd.d, dir:gd.dir, icon:iconForPlace(q.name, q.cat) }); });
  p.sampleJob = sj; makeThumb(p); return p;
}

// ================= boot =================
new ResizeObserver(()=>{ if (!userMoved) fit(); else requestDraw(); }).observe(stage);
(function boot(){
  const p = makeSample(); photos.push(p); cur = 0; job = p.sampleJob;
  ["sample park","sample primary school","sample lake reserve","sample shopping centre","sample station"].forEach(k=>{ const q = job.places.find(z=>z.key===k); const at = autoPoint(p, q.lat, q.lng); if (at) addPin(p, { key:k, name:q.name, icon:iconFor(q) }, at); });
  const hat = autoPoint(p, job.lat, job.lng); if (hat) addPin(p, { house:true, name:"House" }, hat);
  $("sampleTag").hidden = false;
  setTool("select"); setTab(ptab); refreshAll(); requestAnimationFrame(fit);
  if (document.fonts) document.fonts.ready.then(()=>{ const q=P(); if (q) tidySides(q); requestDraw(); });
})();
// read-only hook for automated checks

function lotSnap(p, pts, ll){ const C=Object.assign({ on:true, R:2.5, rot:3, sc:0, mode:"ridge", pen:0.8, gain:1.08 }, window.__snapCfg||{}); if (!C.on || window.__noSnap) return null;
  const img = photoImage(p, false), D=4, W=Math.round(p.w/D), H=Math.round(p.h/D);
  const c=document.createElement("canvas"); c.width=W; c.height=H; const x=c.getContext("2d"); x.drawImage(img,0,0,W,H);
  const d=x.getImageData(0,0,W,H).data, g=new Float32Array(W*H);
  for (let i=0;i<W*H;i++) g[i]=0.3*d[i*4]+0.59*d[i*4+1]+0.11*d[i*4+2];
  const mLat=111132.92, mLng=111412.84*Math.cos(ll[0][0]*Math.PI/180);
  const m0=Math.hypot((ll[1][0]-ll[0][0])*mLat,(ll[1][1]-ll[0][1])*mLng), p0=Math.hypot(pts[1][0]-pts[0][0],pts[1][1]-pts[0][1]); const ppm=p0/m0;
  const wr=Math.max(1.5, 0.3*ppm/D);
  const G=(X,Y)=>{ X=Math.round(X); Y=Math.round(Y); return (X>=0&&Y>=0&&X<W&&Y<H) ? g[Y*W+X] : null; };
  let cx=0,cy=0; pts.forEach(q=>{cx+=q[0];cy+=q[1];}); cx/=pts.length; cy/=pts.length;
  const tf=(dx,dy,sc,rt)=>{ const cs=Math.cos(rt), sn=Math.sin(rt); return pts.map(q=>{ const ux=q[0]-cx, uy=q[1]-cy; return [cx+dx+sc*(ux*cs-uy*sn), cy+dy+sc*(ux*sn+uy*cs)]; }); };
  const resp=(X,Y,nx,ny)=>{ const c0=G(X,Y), l=G(X-nx*wr,Y-ny*wr), r=G(X+nx*wr,Y+ny*wr); if (c0==null||l==null||r==null) return null;
    if (C.mode==="ridge") return Math.max(0, Math.min(l,r)-c0, c0-Math.max(l,r));
    const ridge=Math.max(0, Math.min(l,r)-c0, c0-Math.max(l,r)); return ridge + 0.35*Math.abs(l-r); };
  // per-edge score so one strong roof edge can't dominate: average of per-edge medians
  const score=(P)=>{ let tot=0, ne=0; for (let i=0;i<P.length;i++){ const a=P[i], b=P[(i+1)%P.length]; const L=Math.hypot(b[0]-a[0],b[1]-a[1]); const ns=Math.max(8,Math.round(L/D/2)); const nx=-(b[1]-a[1])/L, ny=(b[0]-a[0])/L; const v=[];
      for (let k=1;k<ns;k++){ const t=k/ns; if (t<0.08||t>0.92) continue; const r=resp((a[0]+(b[0]-a[0])*t)/D,(a[1]+(b[1]-a[1])*t)/D,nx,ny); if (r!=null) v.push(Math.min(r,50)); }
      if (v.length>4){ v.sort((u,w)=>u-w); const m=v[Math.floor(v.length*0.6)]; tot+=m*Math.sqrt(L); ne+=Math.sqrt(L); } } return ne? tot/ne : 0; };
  const pen=(bp)=>C.pen*(Math.hypot(bp[0],bp[1])/ppm) + (C.scPen||15)*Math.abs(bp[2]-1) + 0.3*Math.abs(bp[3]*180/Math.PI);
  const base=score(pts); let bestS=base, bp=[0,0,1,0];
  const R=C.R*ppm, st=Math.max(D, 0.25*ppm), RT=C.rot*Math.PI/180;
  const SCs=[]; for (let s=1-C.sc; s<=1+C.sc+1e-9; s+=Math.max(0.01,C.sc/4)) SCs.push(s);
  for (const sc0 of SCs) for (let rt=-RT; rt<=RT+1e-9; rt+=0.5*Math.PI/180) for (let dx=-R; dx<=R+1e-6; dx+=st) for (let dy=-R; dy<=R+1e-6; dy+=st){ const q=[dx,dy,sc0,rt]; const v=score(tf(...q))-pen(q); if (v>bestS){ bestS=v; bp=q; } }
  for (let it=0; it<3; it++){ const s2=st/(2*(it+1)), r2=0.25*Math.PI/180/(it+1);
    for (const sc of (it? [1-C.sc/4,1,1+C.sc/4] : Array.from({length:13},(_,i)=>1-C.sc+i*C.sc/6))) for (const dr of [-r2,0,r2]) for (const ddx of [-s2,0,s2]) for (const ddy of [-s2,0,s2]){ const q=[bp[0]+ddx,bp[1]+ddy,it?bp[2]*sc:sc,bp[3]+dr]; const v=score(tf(...q))-pen(q); if (v>bestS){ bestS=v; bp=q; } } }
  let P0 = bestS > base*C.gain ? tf(...bp) : pts.map(q=>q.slice());
  // per-edge: slide and tilt each side onto its own fence line, then rebuild corners as intersections
  const edgeScore=(a,b)=>{ const L=Math.hypot(b[0]-a[0],b[1]-a[1]); const ns=Math.max(10,Math.round(L/D)); const nx=-(b[1]-a[1])/L, ny=(b[0]-a[0])/L; const v=[];
    for (let k=1;k<ns;k++){ const t=k/ns; if (t<0.1||t>0.9) continue; const r=resp((a[0]+(b[0]-a[0])*t)/D,(a[1]+(b[1]-a[1])*t)/D,nx,ny); if (r!=null) v.push(Math.min(r,50)); }
    if (v.length<5) return 0; v.sort((u,w)=>u-w); return v[Math.floor(v.length*(C.edgeQ||0.3))]; };
  const n=P0.length, lines=[], info=[];
  for (let i=0;i<n;i++){ const a=P0[i], b=P0[(i+1)%n]; const L=Math.hypot(b[0]-a[0],b[1]-a[1]); const nx=-(b[1]-a[1])/L, ny=(b[0]-a[0])/L, ux=(b[0]-a[0])/L, uy=(b[1]-a[1])/L;
    const s0=edgeScore(a,b); let best={s:s0,d:0,r:0};
    const Dm = (C.edgeR||0.9)*ppm, stp=Math.max(1,0.05*ppm), mx=(a[0]+b[0])/2, my=(a[1]+b[1])/2;
    for (let d=-Dm; d<=Dm+1e-6; d+=stp) for (const rd of [-1,-0.5,0,0.5,1]){ const r=rd*Math.PI/180, cs=Math.cos(r), sn=Math.sin(r);
      const rot=(q)=>{ const x0=q[0]-mx, y0=q[1]-my; return [mx+x0*cs-y0*sn+nx*d, my+x0*sn+y0*cs+ny*d]; };
      const s=edgeScore(rot(a),rot(b)) - 2.0*Math.abs(d)/ppm - 1.0*Math.abs(rd); if (s>best.s){ best={s,d,r}; } }
    const ok = best.s > s0*1.15 + 1 && L > 2*ppm; info.push({ i, s0, s:best.s, d: ok? best.d/ppm : 0, r: ok? best.r*180/Math.PI : 0 });
    const r=ok?best.r:0, d=ok?best.d:0, cs=Math.cos(r), sn=Math.sin(r); const rot=(q)=>{ const x0=q[0]-mx, y0=q[1]-my; return [mx+x0*cs-y0*sn+nx*d, my+x0*sn+y0*cs+ny*d]; };
    lines.push([rot(a),rot(b)]); }
  const P1=[]; for (let i=0;i<n;i++){ const e1=lines[(i-1+n)%n], e2=lines[i]; const [p1,p2]=e1, [p3,p4]=e2; const d1x=p2[0]-p1[0], d1y=p2[1]-p1[1], d2x=p4[0]-p3[0], d2y=p4[1]-p3[1]; const den=d1x*d2y-d1y*d2x;
    let q; if (Math.abs(den) < 1e-6*Math.hypot(d1x,d1y)*Math.hypot(d2x,d2y)+1e-9 || Math.abs(den)/(Math.hypot(d1x,d1y)*Math.hypot(d2x,d2y)) < 0.17) q=[(p2[0]+p3[0])/2,(p2[1]+p3[1])/2];
    else { const t=((p3[0]-p1[0])*d2y-(p3[1]-p1[1])*d2x)/den; q=[p1[0]+d1x*t, p1[1]+d1y*t]; }
    const o=P0[i]; if (Math.hypot(q[0]-o[0],q[1]-o[1]) > 1.3*ppm) q=o.slice(); P1.push(q); }
  window.__lotSnap={ base, best:bestS, dx:bp[0]/ppm, dy:bp[1]/ppm, sc:bp[2], rt:bp[3]*180/Math.PI, edges:info.map(e=>({d:+e.d.toFixed(2), r:+e.r.toFixed(2), s0:+e.s0.toFixed(1), s:+e.s.toFixed(1)})) };
  return P1;
}
function shadeHex(h,k){ const n=parseInt(h.slice(1),16); const f=v=>Math.round(v*k).toString(16).padStart(2,"0"); return "#"+f(n>>16&255)+f(n>>8&255)+f(n&255); }
window.__bae = { project:()=>projectJSON(), setAdj:(o)=>{ const p=P(); if(!p) return false; p.adj=Object.assign({}, ADJ0, o); refreshAll(); return true; }, setHouse:(x,y)=>{ const p=P(); const hp=p&&p.pins.find(q=>q.house); if(!hp) return false; hp.ex=x; hp.ey=y; hp.moved=true; tidySides(p); refreshAll(); return true; }, setCam:(o)=>{ const p=P(); if (!p||!p.cam) return false; Object.assign(p.cam, o, { ready:true, fromGimbal:true }); refreshAll(); return true; }, addPolyLL:(ll, dyaw, dp)=>{ const p=P(); if (!p||!p.cam||!p.cam.ready) return false; const c=Object.assign({}, p.cam, { yaw:p.cam.yaw+(dyaw||0), pitch:p.cam.pitch+(dp||0) }); const pts=ll.map(q=>toWork(p, projectOrig(c, p.ow, p.oh, q[0], q[1]))); if (pts.some(q=>!q)) return false; commit(); p.shapes.push({ id:nid(), type:"poly", pts, color:"#FFFFFF", width:prefs.lineWidth, dashed:new Array(pts.length).fill(false), lens:new Array(pts.length).fill(""), showLens:false }); p.outside='none'; const hp=p.pins.find(q=>q.house); if (hp){ let ax=0, ay=0; pts.forEach(q=>{ ax+=q[0]; ay+=q[1]; }); hp.ex=ax/pts.length; hp.ey=ay/pts.length; hp.moved=true; } tidySides(p); refreshAll(); return true; }, retidy:()=>{ const p=P(); if(!p) return false; p.pins.forEach(x=>{ x.layoutLocked=false; x.sideLocked=false; }); tidySides(p); refreshAll(); return true; }, setPref:(k,v)=>{ prefs[k]=v; return true; }, addLot:(ll, dyaw, dp, lens, area, wt)=>{ const p=P(); if (!p||!p.cam||!p.cam.ready) return false; const c=Object.assign({}, p.cam, { yaw:p.cam.yaw+(dyaw||0), pitch:p.cam.pitch+(dp||0) }); const pts=ll.map(q=>toWork(p, projectOrig(c, p.ow, p.oh, q[0], q[1]))); if (pts.some(q=>!q)) return false; commit();
    try { const R=lotSnap(p, pts, ll); if (R) { pts.splice(0, pts.length, ...R); } } catch(e){ console.warn(e); }
    try { const EO=window.__edgeOff; if (EO && Object.keys(EO).length){ const n=pts.length; let per_px=0, per_m=0; const mLat=111132.92, mLng=111412.84*Math.cos(ll[0][0]*Math.PI/180);
        for (let i=0;i<ll.length;i++){ const a=ll[i], b=ll[(i+1)%ll.length]; per_m+=Math.hypot((b[0]-a[0])*mLat,(b[1]-a[1])*mLng); }
        for (let i=0;i<n;i++){ const a=pts[i], b=pts[(i+1)%n]; per_px+=Math.hypot(b[0]-a[0],b[1]-a[1]); }
        const ppm=per_px/per_m; let cx=0,cy=0; pts.forEach(q=>{cx+=q[0];cy+=q[1];}); cx/=n; cy/=n;
        const L=[]; for (let i=0;i<n;i++){ const a=pts[i], b=pts[(i+1)%n]; const l=Math.hypot(b[0]-a[0],b[1]-a[1]); let nx=-(b[1]-a[1])/l, ny=(b[0]-a[0])/l; const mx=(a[0]+b[0])/2, my=(a[1]+b[1])/2; if ((mx+nx-cx)**2+(my+ny-cy)**2 < (mx-nx-cx)**2+(my-ny-cy)**2){ nx=-nx; ny=-ny; }
          const d=(EO[i]||0)*ppm; L.push([[a[0]+nx*d,a[1]+ny*d],[b[0]+nx*d,b[1]+ny*d]]); }
        const Q=[]; for (let i=0;i<n;i++){ const [p1,p2]=L[(i-1+n)%n], [p3,p4]=L[i]; const d1x=p2[0]-p1[0], d1y=p2[1]-p1[1], d2x=p4[0]-p3[0], d2y=p4[1]-p3[1]; const den=d1x*d2y-d1y*d2x;
          if (Math.abs(den)/(Math.hypot(d1x,d1y)*Math.hypot(d2x,d2y)) < 0.17) Q.push([(p2[0]+p3[0])/2,(p2[1]+p3[1])/2]); else { const t=((p3[0]-p1[0])*d2y-(p3[1]-p1[1])*d2x)/den; Q.push([p1[0]+d1x*t, p1[1]+d1y*t]); } }
        pts.splice(0, n, ...Q); } } catch(e){ console.warn(e); }
    let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9; pts.forEach(q=>{ x0=Math.min(x0,q[0]); x1=Math.max(x1,q[0]); y0=Math.min(y0,q[1]); y1=Math.max(y1,q[1]); });
    const bw=x1-x0, bh=y1-y0; let cw=Math.max(bw/0.6, bh*1.5/0.56); cw=Math.min(cw, p.w, p.h*1.5); cw=Math.max(cw, Math.min(p.w, p.h*1.5)*0.3); const chh=cw/1.5;
    let cx=(x0+x1)/2-cw/2, cy=(y0+y1)/2-chh/2; cx=Math.max(0,Math.min(p.w-cw,cx)); cy=Math.max(0,Math.min(p.h-chh,cy)); const zf=p.w/cw;
    const col = prefs.agency==="grey-s" ? "#FFFFFF" : shadeHex(agency().color, 0.75); const sh={ id:nid(), type:"poly", pts, color:col, width:17/(3*zf), dashed:new Array(pts.length).fill(false), lens:lens.slice(0,pts.length), showLens:true, lensScale:1.5*72/(62*zf), lensWeight:wt>=700?600:400 }; p.shapes.push(sh); p.outside='blur'; p.blurAmt=45; p._blur=null; p.pins.length=0;
    if (area){ p.texts.push({ id:nid(), link:sh.id, style:"area", color:"#ffffff", size:200, x:0, y:0, autoSize:true, lot:area, text:area+"m2", weight:wt||700, fitW:0.72, fitH:0.55 }); }
    refreshAll(); return { crop:[cx,cy,cw,chh], w:p.w, h:p.h, snap:window.__lotSnap }; }, imgToScreen:(x,y)=>{ const r=cv.getBoundingClientRect(); return [r.left + x*view.s+view.tx, r.top + y*view.s+view.ty]; }, photo:()=>{ const p=P(); return p && { w:p.w, h:p.h, cam:p.cam, shapes:p.shapes.map(s=>s.pts.map(q=>q.map(Math.round))), snap:window.__lotSnap||null, horizon:p.horizon, anchors:p.anchors.length, pins:p.pins.map(q=>({ name:q.name, ex:Math.round(q.ex), ey:Math.round(q.ey), side:q.side, flip:!!q.flip, lift:Math.round(q.lift||0), rect:pinRect(p,q).map(Math.round), house:!!q.house, clash:!!q.clash })) }; } };

// ---- Previous days: open any published job (original photos + saved edits + map) in one click
const DAYS_ROOT = /^https?:$/.test(location.protocol) ? "/aerials/" : "https://bakerproduction.com/aerials/";
async function openRemoteJob(entry){
  try{
    if (photos.some(q=>!q.sample) && !confirm("Close the photos you have open and load "+entry.addr+"?")) return;
    photos = []; job = null; pendingProject = null; cur = -1;
    prefs.outMode = entry.full ? "full" : "finals"; savePrefs();
    $("busy").hidden = false; $("busy").textContent = "Downloading "+entry.addr+"…";
    const base = DAYS_ROOT + entry.src;
    const get = async (name, type) => { const r = await fetch(base + encodeURIComponent(name)); if (!r.ok) throw new Error(name+" "+r.status); return new File([await r.blob()], name, { type }); };
    const files = [];
    if (entry.map) files.push(await get(entry.map, entry.map.endsWith(".json") ? "application/json" : "text/html"));
    files.push(await get(entry.project || "project.json", "application/json"));
    for (let i=0;i<entry.photos.length;i++){ $("busy").textContent = `Downloading photo ${i+1} of ${entry.photos.length}…`; files.push(await get(entry.photos[i], "image/jpeg")); }
    // the map loads first so places are ready, then the saved project, then the photos
    const mapF = files[0] && !/project\.json$/.test(files[0].name) && entry.map ? files.shift() : null;
    if (mapF) await loadJobFile(mapF);
    await addFiles(files);
    if (entry.agency){ prefs.agency = entry.agency; savePrefs(); }
    refreshAll(); requestDraw();
    toast(entry.addr + " opened. Edit, then Export.");
  }catch(err){ console.error(err); $("busy").hidden = true; toast("Couldn't open that job: " + err.message); }
}
async function showDays(){
  let idx;
  try{ const r = await fetch(DAYS_ROOT + "index.json", { cache:"no-store" }); idx = await r.json(); }
  catch(e){ toast("Couldn't load the list of previous days."); return; }
  const m = el(`<div class="modal days" role="dialog" aria-label="Previous days"><div class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><b>Previous days</b><button class="btn" data-x>Close</button></div><p class="note">Open a job to tweak pins, boundary or the photo itself (Photo tab → Adjust), then Export. Top-down shots open on their own.</p><div class="list"></div></div></div>`);
  const list = m.querySelector(".list");
  (idx.days||[]).forEach(d=>{
    list.appendChild(el(`<h3>${d.label}</h3>`));
    if (d.gallery){ const g = el(`<a class="note" target="_blank" href="${DAYS_ROOT + d.gallery}">View finished photos</a>`); list.appendChild(g); }
    d.jobs.forEach(j=>{ const row = el(`<div class="job"><div><b>${j.addr}</b><small>${j.who||""} · ${j.photos.length} photo${j.photos.length>1?"s":""}${j.full?" · top-down":""}</small></div><button class="btn">Open</button></div>`);
      row.querySelector("button").onclick = ()=>{ m.remove(); openRemoteJob(j); }; list.appendChild(row); });
  });
  if (!(idx.days||[]).length) list.appendChild(el(`<p class="note">Nothing published yet.</p>`));
  m.querySelector("[data-x]").onclick = ()=>m.remove(); m.onclick = e=>{ if (e.target===m) m.remove(); };
  document.body.appendChild(m);
}
$("daysBtn").onclick = showDays;
// deep link: /pins/?open=<day>/<slug>
(async()=>{ const q = new URLSearchParams(location.search).get("open"); if (!q) return;
  try{ const r = await fetch(DAYS_ROOT + "index.json", { cache:"no-store" }); const idx = await r.json(); const [day, slug] = q.split("/");
    const d = (idx.days||[]).find(x=>x.id===day); const j = d && d.jobs.find(x=>x.slug===slug); if (j) openRemoteJob(j); else toast("That job isn't published.");
  }catch(e){ toast("Couldn't open that job."); } })();

// ---- Fix boundary: simple nudge controls in real metres
function lotPPM(p, sh){
  const E = edgesOf(sh); let px=0, m=0;
  E.forEach((e,i)=>{ const v = parseFloat(String((sh.lens||[])[i]||"").replace(/[^\d.]/g,"")); if (v>0){ px += Math.hypot(e[1][0]-e[0][0], e[1][1]-e[0][1]); m += v; } });
  return m>0 ? px/m : p.w/60;
}
let fixStep = 0.1;
function shapeCentre(sh){ let x=0,y=0; sh.pts.forEach(q=>{x+=q[0]; y+=q[1];}); return [x/sh.pts.length, y/sh.pts.length]; }
function lineX(a1,a2,b1,b2){ const d=(a1[0]-a2[0])*(b1[1]-b2[1])-(a1[1]-a2[1])*(b1[0]-b2[0]); if (Math.abs(d)<1e-9) return null;
  const t=((a1[0]-b1[0])*(b1[1]-b2[1])-(a1[1]-b1[1])*(b1[0]-b2[0]))/d; return [a1[0]+t*(a2[0]-a1[0]), a1[1]+t*(a2[1]-a1[1])]; }
function fixApply(p, sh, op, a){
  commit(); const ppm = lotPPM(p, sh), d = fixStep*ppm, c = shapeCentre(sh), n = sh.pts.length;
  const vtx = sel && sel.id===sh.id ? sel.vtx : null, edge = sel && sel.id===sh.id ? sel.edge : null;
  if (op==="move"){ const [dx,dy]=a; if (vtx!=null) sh.pts[vtx]=[sh.pts[vtx][0]+dx*d, sh.pts[vtx][1]+dy*d]; else sh.pts=sh.pts.map(q=>[q[0]+dx*d, q[1]+dy*d]); }
  else if (op==="rot"){ const r=a*Math.PI/180, cs=Math.cos(r), sn=Math.sin(r); sh.pts=sh.pts.map(q=>{ const x=q[0]-c[0], y=q[1]-c[1]; return [c[0]+x*cs-y*sn, c[1]+x*sn+y*cs]; }); }
  else if (op==="scale"){ const f=1+a; sh.pts=sh.pts.map(q=>[c[0]+(q[0]-c[0])*f, c[1]+(q[1]-c[1])*f]); }
  else if (op==="side" && edge!=null){ // push one side out (+) or in (-), keeping the neighbouring sides' directions
    const i=edge, j=(i+1)%n, A=sh.pts[i], B=sh.pts[j], ex=B[0]-A[0], ey=B[1]-A[1], L=Math.hypot(ex,ey)||1; let nx=-ey/L, ny=ex/L;
    const mid=[(A[0]+B[0])/2,(A[1]+B[1])/2]; if (Math.hypot(mid[0]+nx-c[0],mid[1]+ny-c[1]) < Math.hypot(mid[0]-c[0],mid[1]-c[1])){ nx=-nx; ny=-ny; }
    const A2=[A[0]+nx*d*a, A[1]+ny*d*a], B2=[B[0]+nx*d*a, B[1]+ny*d*a];
    const P0=sh.pts[(i-1+n)%n], P3=sh.pts[(j+1)%n];
    const nA=lineX(P0,A,A2,B2), nB=lineX(B,P3,A2,B2); sh.pts[i]=nA||A2; sh.pts[j]=nB||B2; }
  else if (op==="addpt" && edge!=null){ const i=edge, j=(i+1)%n, m=[(sh.pts[i][0]+sh.pts[j][0])/2,(sh.pts[i][1]+sh.pts[j][1])/2]; sh.pts.splice(i+1,0,m);
    if (sh.lens) sh.lens.splice(i+1,0,""); if (sh.dashed) sh.dashed.splice(i+1,0,!!sh.dashed[i]); sel={kind:"shape", id:sh.id, vtx:i+1}; }
  else if (op==="delpt" && vtx!=null && n>3){ sh.pts.splice(vtx,1); if (sh.lens) sh.lens.splice(vtx,1); if (sh.dashed) sh.dashed.splice(vtx,1); sel={kind:"shape", id:sh.id}; }
  refreshBoundaryTab(); requestDraw();
}
function fixSection(p, sh){
  const vtx = sel && sel.id===sh.id ? sel.vtx : null, edge = sel && sel.id===sh.id ? sel.edge : null;
  const what = vtx!=null ? `corner ${vtx+1}` : edge!=null ? `side ${edge+1}` : "whole boundary";
  const s = el(`<section class="sec fixb"><h2><span>Fix boundary</span><span class="note">moving: ${what}</span></h2></section>`);
  s.appendChild(el(`<p class="note">Drag a white corner on the photo, or use the buttons. Click a corner or a side first to move just that. Arrow keys work too.</p>`));
  const st = el(`<div class="seg"><button data-v="0.05">5 cm</button><button data-v="0.1">10 cm</button><button data-v="0.5">50 cm</button><button data-v="1">1 m</button></div>`);
  st.querySelectorAll("button").forEach(b=>{ b.setAttribute("aria-pressed", String(+b.dataset.v===fixStep)); b.onclick=()=>{ fixStep=+b.dataset.v; refreshBoundaryTab(); }; });
  s.appendChild(st);
  const pad = el(`<div class="fixpad"><span></span><button class="btn" data-m="0,-1" title="Up">↑</button><span></span><button class="btn" data-m="-1,0" title="Left">←</button><button class="btn" data-all title="Select the whole boundary">all</button><button class="btn" data-m="1,0" title="Right">→</button><span></span><button class="btn" data-m="0,1" title="Down">↓</button><span></span></div>`);
  pad.querySelectorAll("[data-m]").forEach(b=>b.onclick=()=>fixApply(p, sh, "move", b.dataset.m.split(",").map(Number)));
  pad.querySelector("[data-all]").onclick=()=>{ sel={kind:"shape", id:sh.id}; refreshBoundaryTab(); requestDraw(); };
  s.appendChild(pad);
  const r1 = el(`<div class="row"><button class="btn" title="Rotate left">⟲ Rotate</button><button class="btn" title="Rotate right">Rotate ⟳</button><button class="btn" title="Smaller">− Smaller</button><button class="btn" title="Bigger">+ Bigger</button></div>`);
  const b1 = r1.querySelectorAll("button"); b1[0].onclick=()=>fixApply(p,sh,"rot",-0.25); b1[1].onclick=()=>fixApply(p,sh,"rot",0.25); b1[2].onclick=()=>fixApply(p,sh,"scale",-0.005); b1[3].onclick=()=>fixApply(p,sh,"scale",0.005);
  s.appendChild(r1);
  if (edge!=null){ const r2 = el(`<div class="row"><button class="btn">Pull side ${edge+1} in</button><button class="btn">Push side ${edge+1} out</button><button class="btn ghost">Add corner here</button></div>`);
    const b2=r2.querySelectorAll("button"); b2[0].onclick=()=>fixApply(p,sh,"side",-1); b2[1].onclick=()=>fixApply(p,sh,"side",1); b2[2].onclick=()=>fixApply(p,sh,"addpt"); s.appendChild(r2); }
  if (vtx!=null && sh.pts.length>3){ const r3 = el(`<div class="row"><button class="btn ghost">Delete corner ${vtx+1}</button></div>`); r3.querySelector("button").onclick=()=>fixApply(p,sh,"delpt"); s.appendChild(r3); }
  s.appendChild(el(`<p class="note">Side lengths and lot size stay as typed (they come from the title). Undo with Ctrl/⌘ Z.</p>`));
  return s;
}
document.addEventListener("keydown", e=>{
  if (/^(INPUT|TEXTAREA|SELECT)$/.test((e.target&&e.target.tagName)||"")) return;
  const p=P(); if (!p || !sel || sel.kind!=="shape") return; const sh=p.shapes.find(x=>x.id===sel.id); if (!sh || sh.type!=="poly") return;
  const M={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]}[e.key]; if (!M) return;
  e.preventDefault(); e.stopPropagation(); const keep=fixStep; if (e.shiftKey) fixStep=0.5; if (e.altKey) fixStep=0.02; fixApply(p, sh, "move", M); fixStep=keep;
}, true);

// ---- big previous / next photo buttons (easy on a phone)
function realPhotos(){ return photos.map((q,i)=>i).filter(i=>!photos[i].sample); }
function goPhoto(d){ const L = photos.length; if (L<2) return; let i = cur + d; if (i<0) i = L-1; if (i>=L) i = 0; selectPhoto(i); refreshNav(); }
function refreshNav(){ const L = photos.length, show = L > 1; ["prevImg","nextImg"].forEach(id=>{ const b=$(id); if (b) b.hidden = !show; });
  const c = $("navCount"); if (c){ c.hidden = !show; c.textContent = show ? `${cur+1} / ${L}` : ""; } }
$("prevImg").onclick = ()=>goPhoto(-1); $("nextImg").onclick = ()=>goPhoto(1);
document.addEventListener("keydown", e=>{ if (/^(INPUT|TEXTAREA|SELECT)$/.test((e.target&&e.target.tagName)||"")) return; if (e.key==="]"||e.key==="PageDown") { e.preventDefault(); goPhoto(1); } else if (e.key==="["||e.key==="PageUp") { e.preventDefault(); goPhoto(-1); } });
// swipe left/right on the photo (one finger, quick horizontal flick, only when not dragging something)
{ let sx=null, sy=null, st=0; const stage=$("cv");
  stage.addEventListener("touchstart", e=>{ if (e.touches.length===1 && !sel){ sx=e.touches[0].clientX; sy=e.touches[0].clientY; st=Date.now(); } else sx=null; }, {passive:true});
  stage.addEventListener("touchend", e=>{ if (sx==null) return; const t=e.changedTouches[0], dx=t.clientX-sx, dy=t.clientY-sy; if (Date.now()-st<400 && Math.abs(dx)>80 && Math.abs(dy)<50 && (()=>{ const p=P(), r=stage.getBoundingClientRect(); return p ? view.s <= Math.min((r.width-48)/p.w,(r.height-48)/p.h)*1.05 : true; })()) goPhoto(dx<0?1:-1); sx=null; }, {passive:true}); }
setInterval(refreshNav, 600);

// ---- "Fix boundary" jump button on the photo
$("fixJump").onclick = ()=>{ const p=P(); if(!p) return; const sh=p.shapes.find(x=>x.type==="poly"); if(!sh) return;
  sel={kind:"shape", id:sh.id}; const tb=$("tabBtnBoundary"); if (tb) tb.click(); refreshBoundaryTab(); requestDraw();
  setTimeout(()=>{ const f=document.querySelector(".fixb"); if (f) f.scrollIntoView({behavior:"smooth", block:"start"}); }, 80); };
setInterval(()=>{ const p=P(), b=$("fixJump"); if (b) b.hidden = !(p && p.shapes.some(x=>x.type==="poly")); }, 600);
window.__bae.renderOut = async ()=>{ const p=P(); await fontsReady(); await waitFinished(p); const b=await renderFull(p); return await new Promise(res=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.readAsDataURL(b); }); };
