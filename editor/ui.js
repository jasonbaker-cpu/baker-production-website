// ================= landmarks (coordinates from TomTom, 21 Oct 2026) =================
const LANDMARKS = [
  ["Optus Stadium",-31.951201,115.889195,"stadium"],["Perth CBD",-31.952854,115.857314,"city"],["Crown Perth",-31.95964,115.895101,"star"],
  ["Elizabeth Quay",-31.9574,115.8567,"star"],["Kings Park",-31.962203,115.832601,"tree"],["Perth Airport",-31.94132,115.974873,"plane"],
  ["Perth Zoo",-31.977002,115.854629,"tree"],["RAC Arena",-31.94891,115.852408,"stadium"],["Matagarup Bridge",-31.954851,115.884613,"star"],
  ["Fiona Stanley Hospital",-32.06932,115.845995,"hospital"],["Westfield Carousel",-32.019151,115.937879,"shop"],["Westfield Booragoon",-32.0339,115.836,"shop"],
  ["Karrinyup Shopping Centre",-31.877197,115.778564,"shop"],["Lakeside Joondalup",-31.7438,115.76649,"shop"],["Cottesloe Beach",-31.9947,115.7522,"beach"],
  ["Scarborough Beach",-31.89272,115.75544,"beach"],["Hillarys Boat Harbour",-31.824417,115.739452,"water"],["Curtin University",-32.00531,115.89241,"uni"],
  ["The University of Western Australia",-31.981178,115.81991,"uni"],["Fremantle Markets",-32.05626,115.74885,"star"]
].map(([name,lat,lng,icon])=>({ key:"lm:"+name.toLowerCase(), name, lat, lng, icon, cat:"landmark", landmark:true }));

const cv = document.getElementById("cv");
const ctx = cv.getContext("2d");
const stage = document.getElementById("stage");
const $ = id => document.getElementById(id);
function el(html){ const d=document.createElement("div"); d.innerHTML=html.trim(); return d.firstChild; }
function escapeHtml(s){ return String(s).replace(/[&<>"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }
let toastT;
function toast(msg, ms){ let t=document.querySelector(".toast"); if(!t){ t=el(`<div class="toast" role="status"></div>`); document.body.appendChild(t); } t.textContent=msg; clearTimeout(toastT); toastT=setTimeout(()=>t.remove(), ms||3000); }

// ================= photo state =================
function newPhoto(name, base, meta, sample){
  const p = { id:nid(), name, base, fin:null, w:base.width, h:base.height, ow:base.width, oh:base.height, k:1, x0:0, y0:0,
    sample:!!sample, thumb:"", meta, cam:makeCam(meta), anchors:[], horizon:null,
    pins:[], shapes:[], texts:[],
    finishOn: !sample && prefs.finish, skyOn: prefs.sky,
    outside: prefs.outside, blurAmt: prefs.blurAmt, darkAmt: prefs.darkAmt,
    disc:{ on:prefs.discOn, text:prefs.discText }, adj:Object.assign({}, ADJ0), undo:[], redo:[] };
  return p;
}
const SNAP_KEYS = ["pins","shapes","texts","cam","anchors","finishOn","skyOn","skyKeepReal","outside","blurAmt","darkAmt","disc","adj"];
function snapshotOf(p){ const o={}; SNAP_KEYS.forEach(k=>o[k]=p[k]); return JSON.stringify(o); }
function commit(){ const p=P(); if(!p) return; p.undo.push(snapshotOf(p)); if(p.undo.length>120) p.undo.shift(); p.redo.length=0; updateUndo(); }
function restore(p, s){ const o=JSON.parse(s); SNAP_KEYS.forEach(k=>p[k]=o[k]); ensureFinish(p); }
function undo(){ const p=P(); if(!p||!p.undo.length) return; p.redo.push(snapshotOf(p)); restore(p,p.undo.pop()); sel=null; refreshAll(); }
function redo(){ const p=P(); if(!p||!p.redo.length) return; p.undo.push(snapshotOf(p)); restore(p,p.redo.pop()); sel=null; refreshAll(); }
function updateUndo(){ const p=P(); $("undoBtn").disabled=!p||!p.undo.length; $("redoBtn").disabled=!p||!p.redo.length; }

// ================= finish (async so the page stays responsive) =================
let finishing = 0;
function ensureFinish(p){ if (p && (p.editorPhoto || p.extraEdited)){ p.finishOn = false; p.fin = null; return; }   /* 31 Oct: editor photos are never re-finished */
  if (!p.finishOn || p.sample) return;
  const key = p.skyOn ? "skyP"+(prefs.skyPlate||"C") : "nosky";
  if (p.fin && p.finKey === key) return;
  if (p._finPending === key) return;
  // 26 Oct: never finish before the sky plate is decoded (that fallback drew blocky grey boxes in the portal)
  if (p.skyOn && typeof SKYP_CACHE !== "undefined" && !SKYP_CACHE[prefs.skyPlate||"C"]){ $("busy").hidden = false; if (!p._waitSky){ p._waitSky = true; loadSkyPlate(prefs.skyPlate||"C", ()=>{ p._waitSky = false; ensureFinish(p); requestDraw(); }); } return; }
  p._finPending = key; finishing++; $("busy").hidden = false;
  setTimeout(()=>{
    try{ const r = finishImage(p.base, p); p.fin = r.canvas; p.finKey = key; p._blur = null; p.skyLine = r.sky ? { m:r.sky.m, b:r.sky.b, h:p.base.height } : null; clampPinsToLand(p); makeThumb(p); }
    catch(err){ console.error(err); p.finishOn = false; toast("The finish couldn't run on this photo. It's shown unfinished."); }
    p._finPending = null; finishing--; if (!finishing) $("busy").hidden = true;
    refreshStrip(); requestDraw();
  }, 30);
}

// ================= rendering loop =================
let dirty = false;
function requestDraw(){ if(!dirty){ dirty=true; requestAnimationFrame(draw); } }
function draw(){
  dirty=false;
  const dpr = window.devicePixelRatio||1, r = stage.getBoundingClientRect();
  const W = Math.max(1,Math.round(r.width*dpr)), H = Math.max(1,Math.round(r.height*dpr));
  if (cv.width!==W || cv.height!==H){ cv.width=W; cv.height=H; }
  ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,W,H);
  const p = P(); if(!p) return;
  ctx.setTransform(view.s*dpr,0,0,view.s*dpr,view.tx*dpr,view.ty*dpr);
  ctx.imageSmoothingQuality="high";
  drawScene(ctx, p, { hide:hideGfx, before:showBefore });
  { const cr = !hideGfx && lotCrop(p); if (cr){ const k=1/view.s; ctx.save(); ctx.fillStyle="rgba(0,0,0,.45)"; ctx.beginPath(); ctx.rect(0,0,p.w,p.h); ctx.rect(cr[0],cr[1],cr[2],cr[3]); ctx.fill("evenodd");
    ctx.strokeStyle="#f2b33d"; ctx.lineWidth=2*k; ctx.setLineDash([8*k,6*k]); ctx.strokeRect(cr[0],cr[1],cr[2],cr[3]); ctx.setLineDash([]); ctx.font=`600 ${14*k}px system-ui`; ctx.fillStyle="#f2b33d"; ctx.fillText("Export area · 3:2", cr[0]+8*k, cr[1]+20*k); ctx.restore(); } }
  if (hideGfx || showBefore) return;
  const k = 1/view.s;
  if (sel && sel.kind==="pin"){ const pin = p.pins.find(x=>x.id===sel.id); if (pin){ const r = pinRect(p,pin), pad=6*k; ctx.save(); ctx.strokeStyle="#f2b33d"; ctx.lineWidth=1.6*k; ctx.setLineDash([5*k,4*k]); ctx.strokeRect(r[0]-pad,r[1]-pad,r[2]-r[0]+pad*2,r[3]-r[1]+pad*2); ctx.restore(); } }
  if (sel && sel.kind==="shape"){
    const sh = p.shapes.find(x=>x.id===sel.id);
    if (sh){
      if (sel.edge!=null){ const e=edgesOf(sh)[sel.edge]; if(e){ ctx.save(); ctx.strokeStyle="#f2b33d"; ctx.lineWidth=4*k; ctx.setLineDash([6*k,4*k]); ctx.beginPath(); ctx.moveTo(e[0][0],e[0][1]); ctx.lineTo(e[1][0],e[1][1]); ctx.stroke(); ctx.restore(); } }
      sh.pts.forEach((q,i)=>{ ctx.beginPath(); ctx.arc(q[0],q[1], (sel.vtx===i?10:8)*k, 0, Math.PI*2); ctx.fillStyle = sel.vtx===i ? "#f2b33d" : "#fff"; ctx.fill(); ctx.lineWidth=1.6*k; ctx.strokeStyle="#111"; ctx.stroke(); });
    }
  }
  if (sel && sel.kind==="text"){ const t = p.texts.find(x=>x.id===sel.id); if (t){ const m=textMetrics(ctx,t,p); const pad=5*k; ctx.save(); ctx.strokeStyle="#f2b33d"; ctx.lineWidth=1.5*k; ctx.setLineDash([5*k,4*k]); ctx.strokeRect(m.x-pad,m.y-pad,m.bw+pad*2,m.bh+pad*2); ctx.restore(); } }
  // anchors the editor clicked
  p.anchors.forEach(a=>{ const q = toWork(p,[a.ox,a.oy]); ctx.save(); ctx.strokeStyle="#3fd0ff"; ctx.lineWidth=2*k; ctx.beginPath(); ctx.arc(q[0],q[1],10*k,0,7); ctx.moveTo(q[0]-16*k,q[1]); ctx.lineTo(q[0]+16*k,q[1]); ctx.moveTo(q[0],q[1]-16*k); ctx.lineTo(q[0],q[1]+16*k); ctx.stroke(); ctx.restore(); });
  if (draft && draft.pts.length){
    const pts = hover ? draft.pts.concat([hover]) : draft.pts;
    ctx.save(); ctx.strokeStyle=prefs.lineColor; ctx.lineWidth=Math.max(prefs.lineWidth*3*p.w/3000, 2*k);
    ctx.beginPath(); pts.forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1])); ctx.stroke();
    draft.pts.forEach((q,i)=>{ ctx.beginPath(); ctx.arc(q[0],q[1],(i===0&&draft.type==="poly"?8:5)*k,0,Math.PI*2); ctx.fillStyle = i===0 && draft.type==="poly" ? "#f2b33d" : "#fff"; ctx.fill(); ctx.lineWidth=1.5*k; ctx.strokeStyle="#111"; ctx.stroke(); });
    ctx.restore();
  }
}

// ================= view =================
function fit(){ const p=P(); if(!p) return; const r=stage.getBoundingClientRect(); const pad=24; const s=Math.min((r.width-pad*2)/p.w,(r.height-pad*2)/p.h); view.s=s; view.tx=(r.width-p.w*s)/2; view.ty=(r.height-p.h*s)/2; userMoved=false; zoomLabel(); requestDraw(); }
function zoomAt(f, sx, sy){ userMoved=true; const ns=Math.max(0.02,Math.min(8,view.s*f)); const g=ns/view.s; view.tx=sx-(sx-view.tx)*g; view.ty=sy-(sy-view.ty)*g; view.s=ns; zoomLabel(); requestDraw(); }
function zoomLabel(){ $("zoomVal").textContent = Math.round(view.s*100)+"%"; }
function toImg(e){ const r=cv.getBoundingClientRect(); return [ (e.clientX-r.left-view.tx)/view.s, (e.clientY-r.top-view.ty)/view.s ]; }
function toScr(e){ const r=cv.getBoundingClientRect(); return [ e.clientX-r.left, e.clientY-r.top ]; }

// ================= places =================
function allPlaces(){
  const out = [];
  if (job) job.places.forEach(q=>out.push(q));
  if (job){ LANDMARKS.forEach(l=>{ const g = geoDist(job.lat, job.lng, l.lat, l.lng); if (g.d < 25000 && !out.some(q=>q.name.toLowerCase()===l.name.toLowerCase())) out.push(Object.assign({}, l, { dist:g.d, dir:g.dir })); }); }
  return out;
}
function placeForKey(key){ return allPlaces().find(q=>q.key===key); }
function iconFor(q){ return iconForPlace(q.name, q.cat) !== "star" ? iconForPlace(q.name, q.cat) : (ICON_BMP[q.icon]||ICONS[q.icon] ? q.icon : "star"); }
function landY(p, x){ const L = p.skyLine; if (!L) return -1e9; return L.m*x + L.b + 0.008*L.h; }
// A place beyond the horizon still gets its pin tip on land, never in the sky
function clampPinsToLand(p){ let ch=false; (p.pins||[]).forEach(pin=>{ if (pin.house || pin.moved) return; const y = landY(p, pin.ex); if (pin.ey < y){ pin.ey = y; ch=true; } }); if (ch) tidySides(p); }
function autoPoint(p, lat, lng){ const q = projectW(p, lat, lng); if (!inFrame(p, q, 2)) return null; const y = landY(p, q[0]); if (q[1] < y) q[1] = y; return q; }
// Beach pins (26 Oct): beach points are often charted offshore. If the tip lands on water, walk it toward the house
// until it reaches sand/land, so the pin stands on the beach rather than in the sea.
function shoreSnap(p, q){ try{ const c = p.base; if (!c) return q; const x = c.getContext("2d"), W = c.width, H = c.height, sc = W/(p.w||W);
    const hp = job && autoPoint(p, job.lat, job.lng) || [p.w/2, p.h]; const isWater = (u,v)=>{ const X=Math.round(u*sc), Y=Math.round(v*sc); if (X<3||Y<3||X>W-4||Y>H-4) return false;
      const d = x.getImageData(X-3,Y-3,7,7).data; let r=0,g=0,b=0,yy=0,y2=0; for (let k=0;k<d.length;k+=4){ r+=d[k]; g+=d[k+1]; b+=d[k+2]; const L=.3*d[k]+.59*d[k+1]+.11*d[k+2]; yy+=L; y2+=L*L; } const n=d.length/4; r/=n; g/=n; b/=n; const sd=Math.sqrt(Math.max(0,y2/n-(yy/n)*(yy/n)));
      return b > r + 10 && g > r + 4 && sd < 14; };
    if (!isWater(q[0], q[1])) return q; const dx = hp[0]-q[0], dy = hp[1]-q[1], L = Math.hypot(dx,dy)||1, st = Math.max(2, 0.003*p.w);
    for (let t=st; t<L*0.9; t+=st){ const u=q[0]+dx/L*t, v=q[1]+dy/L*t; if (!isWater(u,v)){ const e=t+2*st; return [q[0]+dx/L*e, q[1]+dy/L*e]; } } }catch(e){} return q; }
function placePins(p, onlyAuto){
  if (!job) return;
  p.pins.forEach(pin=>{
    if (onlyAuto && pin.moved) return;
    // The house pin goes where the editor clicked the roof (the address point can be ~10 m off the house).
    const ha = pin.house && p.anchors.find(a=>a.key==="__house");
    if (ha){ const q = toWork(p,[ha.ox,ha.oy]); pin.ex = q[0]; pin.ey = q[1]; pin.moved = false; return; }
    const ll = pin.house ? job : placeForKey(pin.key); if (!ll) return;
    let q = autoPoint(p, ll.lat, ll.lng); if (!q) return;
    if (!pin.house && (/beach/i.test(ll.name||pin.name||"") || ll.cat==="beach")) q = shoreSnap(p, q);
    pin.ex = q[0]; pin.ey = q[1]; pin.moved = false;
  });
  tidySides(p);
}
function addPin(p, opts, at){ const pin = Object.assign({ id:nid(), side:"right", moved:false }, opts, { ex:at[0], ey:at[1] }); p.pins.push(pin); tidySides(p); return pin; }
function togglePlace(key){
  const p = P(); if (!p || !job) return;
  const existing = p.pins.find(x=>x.key===key);
  if (existing){ commit(); p.pins = p.pins.filter(x=>x!==existing); refreshAll(); return; }
  const q = placeForKey(key); if (!q) return;
  let at = autoPoint(p, q.lat, q.lng); if (at && (/beach/i.test(q.name||"") || q.cat==="beach")) at = shoreSnap(p, at);
  if (!at){ armed = { kind:"place", key }; setHint(); refreshPinsTab(); toast(p.cam && p.cam.ready ? `${q.name} is outside this photo. Click where it is to pin it anyway.` : `Click where ${q.name} is on the photo`); return; }
  commit(); addPin(p, { key, name:q.name, icon:iconFor(q) }, at); refreshAll();
}
function addHousePin(){
  const p = P(); if (!p) return;
  const at = job ? autoPoint(p, job.lat, job.lng) : null;
  if (!at){ armed = { kind:"housepin" }; setHint(); refreshPinsTab(); toast("Click the house roof to drop the house pin"); return; }
  commit(); p.pins = p.pins.filter(x=>!x.house); addPin(p, { house:true, name:"House" }, at); refreshAll();
}

// ================= pointer interaction =================
let drag = null; const pointers = new Map(); let pinch = null; let spaceDown = false;
function hitTest(pt){
  const p=P(); const k=1/view.s; const tol=8*k;
  if (sel && sel.kind==="shape"){ const sh=p.shapes.find(x=>x.id===sel.id); if (sh){ for(let i=0;i<sh.pts.length;i++) if (dist(pt,sh.pts[i])<tol+8*k) return {kind:"vtx", shape:sh, i}; } }
  for (let i=p.pins.length-1;i>=0;i--) if (pinHit(p, p.pins[i], pt, 2*k)) return { kind:"pin", pin:p.pins[i] };
  for (let i=p.texts.length-1;i>=0;i--){ const t=p.texts[i]; const m=textMetrics(ctx,t,p); if (pt[0]>=m.x-4*k && pt[0]<=m.x+m.bw+4*k && pt[1]>=m.y-4*k && pt[1]<=m.y+m.bh+4*k) return {kind:"text", text:t}; }
  for (let i=p.shapes.length-1;i>=0;i--){ const sh=p.shapes[i]; const edges=edgesOf(sh); for (let j=0;j<edges.length;j++) if (distSeg(pt,edges[j][0],edges[j][1])<tol+sh.width*p.w/1000) return {kind:"edge", shape:sh, i:j}; }
  for (let i=p.shapes.length-1;i>=0;i--){ const sh=p.shapes[i]; if (sh.type==="poly" && inPoly(pt,sh.pts)) return {kind:"body", shape:sh}; }
  return null;
}
function handleArmedClick(p, pt){
  const a = armed; armed = null;
  if (a.kind === "house" || a.kind === "landmark"){
    const ll = a.kind==="house" ? job : placeForKey(a.key);
    if (!ll){ toast("Load the amenity map first"); refreshPinsTab(); return; }
    commit();
    const o = toOrig(p, pt);
    p.anchors = p.anchors.filter(x=>x.key !== (a.kind==="house" ? "__house" : a.key));
    p.anchors.push({ key: a.kind==="house" ? "__house" : a.key, name: a.kind==="house" ? "House" : ll.name, lat: ll.lat, lng: ll.lng, ox:o[0], oy:o[1] });
    const ok = realign(p);
    if (!ok){ p.anchors.pop(); realign(p); toast("That click doesn't fit the drone's position. Check you clicked the right spot."); refreshAll(); return; }
    if (a.kind==="house" && !p.pins.some(x=>x.house)) addPin(p, { house:true, name:"House" }, pt);
    placePins(p, true);
    const n = p.anchors.length;
    toast(n===1 ? "Lined up on the house. Add one far landmark for the most accurate pins." : `Lined up on ${n} points. Pins updated.`, 4000);
    refreshAll(); return;
  }
  if (a.kind === "place"){ const q = placeForKey(a.key); if (q){ commit(); const pin = addPin(p, { key:a.key, name:q.name, icon:iconFor(q) }, pt); pin.moved = true; sel={kind:"pin",id:pin.id}; } refreshAll(); return; }
  if (a.kind === "housepin"){ commit(); p.pins = p.pins.filter(x=>!x.house); addPin(p, { house:true, name:"House" }, pt).moved = true; refreshAll(); return; }
  if (a.kind === "custom"){ commit(); const pin = addPin(p, { name:"New place", icon:"star" }, pt); pin.moved = true; sel={kind:"pin",id:pin.id}; setTool("select"); refreshAll(); setTimeout(()=>{ const i=$("pnName"); if(i){ i.focus(); i.select(); } },0); }
}
cv.addEventListener("pointerdown", e=>{
  if (!P()) return;
  cv.setPointerCapture(e.pointerId); pointers.set(e.pointerId, toScr(e));
  if (pointers.size===2){ drag=null; const [a,b]=[...pointers.values()]; pinch={ d:dist(a,b), mid:[(a[0]+b[0])/2,(a[1]+b[1])/2] }; return; }
  const pt = toImg(e);
  if (e.button===1 || spaceDown){ drag={type:"pan", last:toScr(e)}; return; }
  if (e.button!==0 && e.pointerType==="mouse") return;
  const p = P();
  if (armed){ handleArmedClick(p, pt); return; }
  if (tool==="pin"){ armed = { kind:"custom" }; handleArmedClick(p, pt); return; }
  if (tool==="poly" || tool==="line"){
    if (!draft) draft = { type:tool, pts:[] };
    const k=1/view.s;
    if (draft.type==="poly" && draft.pts.length>=3 && dist(pt,draft.pts[0])<12*k){ finishDraft(); return; }
    draft.pts.push(pt); hover=pt; updateDrawbar(); requestDraw(); return;
  }
  if (tool==="text"){
    commit(); const t = { id:nid(), x:pt[0], y:pt[1], text:"Label", size:56, style:"shadow", color:"#ffffff", bg:"#ffffff", bold:false };
    p.texts.push(t); sel={kind:"text", id:t.id}; setTool("select"); refreshAll();
    setTimeout(()=>{ const ta=$("tText"); if(ta){ ta.focus(); ta.select(); } },0); return;
  }
  const h = hitTest(pt);
  if (!h){ sel=null; drag={type:"pan", last:toScr(e)}; refreshPanel(); requestDraw(); return; }
  if (h.kind==="pin"){ sel={kind:"pin", id:h.pin.id}; drag={type:"pin", pin:h.pin, last:pt, committed:false}; }
  else if (h.kind==="vtx"){ sel={kind:"shape", id:h.shape.id, vtx:h.i}; drag={type:"vtx", shape:h.shape, i:h.i, committed:false}; }
  else if (h.kind==="text"){ sel={kind:"text", id:h.text.id}; drag={type:"text", text:h.text, last:pt, committed:false}; }
  else if (h.kind==="edge"){ const same = sel && sel.id===h.shape.id; sel={kind:"shape", id:h.shape.id, edge: same ? h.i : null}; drag={type:"move", shape:h.shape, last:pt, committed:false}; }
  else { sel={kind:"shape", id:h.shape.id}; drag={type:"move", shape:h.shape, last:pt, committed:false}; }
  refreshPanel(); requestDraw();
});
cv.addEventListener("pointermove", e=>{
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, toScr(e));
  if (pinch && pointers.size===2){ const [a,b]=[...pointers.values()]; const d=dist(a,b); const mid=[(a[0]+b[0])/2,(a[1]+b[1])/2]; view.tx+=mid[0]-pinch.mid[0]; view.ty+=mid[1]-pinch.mid[1]; zoomAt(d/pinch.d, mid[0], mid[1]); pinch={d,mid}; return; }
  if (!P()) return;
  const pt = toImg(e);
  if (draft){ hover=pt; requestDraw(); }
  if (!drag){ updateCursor(pt); return; }
  if (drag.type==="pan"){ userMoved=true; const s=toScr(e); view.tx+=s[0]-drag.last[0]; view.ty+=s[1]-drag.last[1]; drag.last=s; requestDraw(); return; }
  if (!drag.committed){ commit(); drag.committed=true; }
  if (drag.type==="pin"){ drag.pin.ex+=pt[0]-drag.last[0]; drag.pin.ey+=pt[1]-drag.last[1]; drag.pin.moved=true; drag.last=pt; }
  else if (drag.type==="vtx"){ drag.shape.pts[drag.i]=[pt[0],pt[1]]; }
  else if (drag.type==="move"){ const dx=pt[0]-drag.last[0], dy=pt[1]-drag.last[1]; drag.shape.pts.forEach(q=>{q[0]+=dx;q[1]+=dy;}); drag.last=pt; }
  else if (drag.type==="text"){ drag.text.x+=pt[0]-drag.last[0]; drag.text.y+=pt[1]-drag.last[1]; drag.text.moved=true; drag.last=pt; }
  requestDraw();
});
function endPointer(e){ pointers.delete(e.pointerId); if (pointers.size<2) pinch=null; if (drag && drag.committed){ if (drag.type==="vtx"||drag.type==="move") refreshBoundaryTab(); refreshLayers(); } drag=null; }
cv.addEventListener("pointerup", endPointer); cv.addEventListener("pointercancel", endPointer);
cv.addEventListener("pointerleave", ()=>{ if(draft){ hover=null; requestDraw(); } });
cv.addEventListener("dblclick", e=>{
  if (!P()) return; const pt = toImg(e), p=P();
  if (draft){ if (draft.pts.length>=2 && dist(draft.pts[draft.pts.length-1], draft.pts[draft.pts.length-2]) < 4/view.s) draft.pts.pop(); finishDraft(); return; }
  if (tool!=="select") return;
  const h = hitTest(pt);
  if (h && h.kind==="edge"){ commit(); h.shape.pts.splice(h.i+1,0,pt); if (h.shape.dashed) h.shape.dashed.splice(h.i+1,0,!!h.shape.dashed[h.i]); if (h.shape.lens) h.shape.lens.splice(h.i+1,0,""); sel={kind:"shape", id:h.shape.id, vtx:h.i+1}; refreshAll(); toast("Corner added"); }
  else if (h && h.kind==="pin"){ const i=$("pnName"); if(i){ i.focus(); i.select(); } }
});
stage.addEventListener("wheel", e=>{ if(!P()) return; e.preventDefault(); const s=toScr(e); zoomAt(Math.exp(-e.deltaY*(e.ctrlKey?0.01:0.0018)), s[0], s[1]); }, {passive:false});
function updateCursor(pt){
  if (spaceDown){ cv.style.cursor="grab"; return; }
  if (armed || tool!=="select"){ cv.style.cursor="crosshair"; return; }
  const h=hitTest(pt); cv.style.cursor = !h ? "grab" : h.kind==="vtx" ? "pointer" : "move";
}
function finishDraft(){
  if (!draft) return;
  const min = draft.type==="poly" ? 3 : 2;
  if (draft.pts.length>=min){
    commit();
    const n = draft.type==="poly" ? draft.pts.length : draft.pts.length-1;
    const sh = { id:nid(), type:draft.type, pts:draft.pts, color:((AGENCIES[prefs.agency]||{}).line||prefs.lineColor), width:prefs.lineWidth, dashed:new Array(n).fill(draft.type==="line"), lens:new Array(n).fill(""), showLens:true };
    P().shapes.push(sh); sel={kind:"shape", id:sh.id};
    draft=null; hover=null; setTool("select"); setTab("boundary"); refreshAll();
  } else toast(draft.type==="poly" ? "A boundary needs at least 3 corners" : "A line needs at least 2 points");
}
function cancelDraft(){ draft=null; hover=null; updateDrawbar(); requestDraw(); }
function updateDrawbar(){ $("drawbar").hidden = !draft; setHint(); }
function setTool(t){
  if (draft && t!==draft.type) cancelDraft();
  tool=t; document.querySelectorAll(".tool[data-tool]").forEach(b=>b.setAttribute("aria-pressed", b.dataset.tool===t));
  cv.style.cursor = t==="select" ? "default" : "crosshair"; setHint();
}
function setHint(){
  const h = $("hint"); h.classList.remove("go");
  const p = P();
  if (!p){ h.textContent="Add drone photos to start"; return; }
  if (hideGfx){ h.textContent="Graphics hidden. Press H to show."; return; }
  if (armed){
    h.classList.add("go");
    const q = armed.key ? placeForKey(armed.key) : null;
    h.textContent = armed.kind==="house" ? "Click the middle of the subject house's roof" :
      armed.kind==="landmark" ? `Click exactly on ${q ? q.name : "the landmark"}` :
      armed.kind==="housepin" ? "Click the house roof" : armed.kind==="custom" ? "Click the spot for the new pin" : `Click where ${q ? q.name : "it"} is`;
    h.textContent += " · Esc to cancel"; return;
  }
  const msg = { select:"Drag pins to adjust. Pick places on the Pins tab.", pin:"Click a spot to drop a custom pin.",
    poly: draft ? "Click each corner. Click the first point (or Finish) to close." : "Click each corner of the lot.",
    line: draft ? "Click to add points. Double-click or Finish to end." : "Click to start an open line.", text:"Click where the label should go." }[tool];
  h.textContent = msg;
}
document.querySelectorAll(".tool[data-tool]").forEach(b=>b.addEventListener("click",()=>setTool(b.dataset.tool)));
function toggleHide(){ hideGfx=!hideGfx; $("hideBtn").setAttribute("aria-pressed",hideGfx); setHint(); requestDraw(); }
$("hideBtn").addEventListener("click", toggleHide);
$("finishBtn").addEventListener("click", finishDraft); $("cancelBtn").addEventListener("click", cancelDraft);
$("zoomIn").addEventListener("click",()=>{ const r=stage.getBoundingClientRect(); zoomAt(1.25,r.width/2,r.height/2); });
$("zoomOut").addEventListener("click",()=>{ const r=stage.getBoundingClientRect(); zoomAt(0.8,r.width/2,r.height/2); });
$("fitBtn").addEventListener("click", fit);
$("undoBtn").addEventListener("click", undo); $("redoBtn").addEventListener("click", redo);
const bb = $("beforeBtn");
const beforeOn = ()=>{ showBefore=true; requestDraw(); }, beforeOff = ()=>{ if(showBefore){ showBefore=false; requestDraw(); } };
bb.addEventListener("pointerdown", beforeOn); bb.addEventListener("pointerup", beforeOff); bb.addEventListener("pointerleave", beforeOff);
document.addEventListener("keydown", e=>{
  const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
  if ((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==="z" && !typing){ e.preventDefault(); e.shiftKey?redo():undo(); return; }
  if (typing) return;
  if (e.code==="Space"){ spaceDown=true; cv.style.cursor="grab"; e.preventDefault(); return; }
  const k=e.key.toLowerCase();
  if (k==="v") setTool("select"); else if (k==="p") setTool("pin"); else if (k==="b") setTool("poly"); else if (k==="l") setTool("line"); else if (k==="t") setTool("text"); else if (k==="h") toggleHide();
  else if (k==="\\"){ beforeOn(); }
  else if (e.key==="Enter") finishDraft();
  else if (e.key==="Escape"){ if (armed){ armed=null; setHint(); refreshPinsTab(); } else if (draft) cancelDraft(); else { sel=null; refreshPanel(); requestDraw(); } }
  else if (e.key==="Backspace"||e.key==="Delete"){ if (draft){ draft.pts.pop(); if(!draft.pts.length) cancelDraft(); requestDraw(); } else deleteSelection(); e.preventDefault(); }
});
document.addEventListener("keyup", e=>{ if (e.code==="Space"){ spaceDown=false; cv.style.cursor = tool==="select"?"default":"crosshair"; } if (e.key==="\\") beforeOff(); });
function deleteSelection(){
  const p=P(); if(!p||!sel) return; commit();
  if (sel.kind==="pin") p.pins = p.pins.filter(x=>x.id!==sel.id);
  else if (sel.kind==="text") p.texts = p.texts.filter(t=>t.id!==sel.id);
  else {
    const sh=p.shapes.find(x=>x.id===sel.id);
    if (sh && sel.vtx!=null && sh.pts.length > (sh.type==="poly"?3:2)){ sh.pts.splice(sel.vtx,1); const ei=Math.min(sel.vtx, sh.dashed.length-1); sh.dashed.splice(ei,1); sh.lens.splice(ei,1); sel={kind:"shape",id:sh.id}; refreshAll(); return; }
    p.shapes = p.shapes.filter(x=>x.id!==sel.id); p.texts = p.texts.filter(t=>t.link!==sel.id);
  }
  sel=null; refreshAll();
}
