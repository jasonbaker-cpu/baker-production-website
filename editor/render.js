// ================= icons (white, drawn in a unit box -1..1) =================
const ICONS = {
  tree(c){ c.beginPath(); c.moveTo(0,-.88); c.lineTo(.36,-.42); c.lineTo(.2,-.42); c.lineTo(.52,0); c.lineTo(.3,0); c.lineTo(.66,.42); c.lineTo(-.66,.42); c.lineTo(-.3,0); c.lineTo(-.52,0); c.lineTo(-.2,-.42); c.lineTo(-.36,-.42); c.closePath(); c.fill(); c.fillRect(-.09,.4,.18,.42); },
  park(c){ ICONS.tree(c); },
  water(c){ c.lineWidth=.16; c.lineCap="round"; for (const y of [-.38,0,.38]){ c.beginPath(); c.moveTo(-.75,y); c.bezierCurveTo(-.45,y-.25,-.3,y+.25,0,y); c.bezierCurveTo(.3,y-.25,.45,y+.25,.75,y); c.stroke(); } },
  beach(c){ c.beginPath(); c.moveTo(-.8,-.05); c.quadraticCurveTo(0,-.95,.8,-.05); c.closePath(); c.fill(); c.lineWidth=.12; c.beginPath(); c.moveTo(0,-.3); c.lineTo(.12,.6); c.stroke(); c.beginPath(); c.moveTo(-.8,.72); c.quadraticCurveTo(0,.45,.8,.72); c.stroke(); },
  school(c){ c.beginPath(); c.moveTo(-.85,-.2); c.lineTo(0,-.62); c.lineTo(.85,-.2); c.lineTo(0,.22); c.closePath(); c.fill(); c.beginPath(); c.moveTo(-.48,0); c.lineTo(-.48,.42); c.quadraticCurveTo(0,.72,.48,.42); c.lineTo(.48,0); c.lineTo(0,.24); c.closePath(); c.fill(); c.lineWidth=.08; c.beginPath(); c.moveTo(.7,-.12); c.lineTo(.7,.42); c.stroke(); },
  child(c){ c.beginPath(); c.arc(0,-.52,.26,0,7); c.fill(); c.beginPath(); c.moveTo(-.42,-.12); c.lineTo(.42,-.12); c.lineTo(.3,.3); c.lineTo(.3,.8); c.lineTo(.07,.8); c.lineTo(0,.4); c.lineTo(-.07,.8); c.lineTo(-.3,.8); c.lineTo(-.3,.3); c.closePath(); c.fill(); },
  library(c){ c.beginPath(); c.moveTo(0,-.4); c.quadraticCurveTo(-.45,-.62,-.85,-.5); c.lineTo(-.85,.5); c.quadraticCurveTo(-.45,.38,0,.6); c.quadraticCurveTo(.45,.38,.85,.5); c.lineTo(.85,-.5); c.quadraticCurveTo(.45,-.62,0,-.4); c.closePath(); c.fill(); c.save(); c.globalCompositeOperation="destination-out"; c.lineWidth=.08; c.beginPath(); c.moveTo(0,-.36); c.lineTo(0,.56); c.stroke(); c.restore(); },
  pool(c){ c.beginPath(); c.arc(.32,-.5,.2,0,7); c.fill(); c.lineWidth=.17; c.lineCap="round"; c.lineJoin="round"; c.beginPath(); c.moveTo(-.65,-.05); c.lineTo(-.15,-.3); c.lineTo(.25,-.05); c.stroke(); ICONS._waves(c,[.28,.6]); },
  _waves(c,ys){ c.lineWidth=.13; c.lineCap="round"; for (const y of ys){ c.beginPath(); c.moveTo(-.8,y); c.bezierCurveTo(-.5,y-.18,-.3,y+.18,0,y); c.bezierCurveTo(.3,y-.18,.5,y+.18,.8,y); c.stroke(); } },
  stadium(c){ c.lineWidth=.13; c.beginPath(); c.ellipse(0,.05,.82,.5,0,0,7); c.stroke(); c.beginPath(); c.ellipse(0,.05,.45,.24,0,0,7); c.stroke(); c.fillRect(-.66,-.85,.1,.5); c.fillRect(.56,-.85,.1,.5); c.fillRect(-.74,-.92,.26,.14); c.fillRect(.48,-.92,.26,.14); },
  shop(c){ c.beginPath(); c.moveTo(-.62,-.3); c.lineTo(.62,-.3); c.lineTo(.72,.78); c.lineTo(-.72,.78); c.closePath(); c.fill(); c.lineWidth=.12; c.beginPath(); c.arc(0,-.3,.3,Math.PI,0); c.stroke(); },
  train(c){ c.beginPath(); roundRect(c,-.55,-.8,1.1,1.25,.22); c.fill(); c.save(); c.globalCompositeOperation="destination-out"; c.fillRect(-.4,-.6,.8,.42); c.beginPath(); c.arc(-.27,.17,.11,0,7); c.arc(.27,.17,.11,0,7); c.fill(); c.restore(); c.lineWidth=.12; c.lineCap="round"; c.beginPath(); c.moveTo(-.35,.55); c.lineTo(-.6,.88); c.moveTo(.35,.55); c.lineTo(.6,.88); c.stroke(); },
  bus(c){ c.beginPath(); roundRect(c,-.6,-.75,1.2,1.35,.18); c.fill(); c.save(); c.globalCompositeOperation="destination-out"; c.fillRect(-.45,-.55,.9,.45); c.beginPath(); c.arc(-.3,.3,.1,0,7); c.arc(.3,.3,.1,0,7); c.fill(); c.restore(); c.fillRect(-.5,.6,.22,.2); c.fillRect(.28,.6,.22,.2); },
  hospital(c){ c.fillRect(-.22,-.75,.44,1.5); c.fillRect(-.75,-.22,1.5,.44); },
  golf(c){ c.lineWidth=.1; c.beginPath(); c.moveTo(-.2,.65); c.lineTo(-.2,-.8); c.stroke(); c.beginPath(); c.moveTo(-.2,-.8); c.lineTo(.6,-.52); c.lineTo(-.2,-.24); c.closePath(); c.fill(); c.beginPath(); c.ellipse(0,.7,.62,.16,0,0,7); c.fill(); },
  plane(c){ c.beginPath(); c.moveTo(0,-.9); c.quadraticCurveTo(.12,-.9,.12,-.6); c.lineTo(.12,-.15); c.lineTo(.85,.25); c.lineTo(.85,.42); c.lineTo(.12,.18); c.lineTo(.12,.55); c.lineTo(.35,.75); c.lineTo(.35,.88); c.lineTo(0,.78); c.lineTo(-.35,.88); c.lineTo(-.35,.75); c.lineTo(-.12,.55); c.lineTo(-.12,.18); c.lineTo(-.85,.42); c.lineTo(-.85,.25); c.lineTo(-.12,-.15); c.lineTo(-.12,-.6); c.quadraticCurveTo(-.12,-.9,0,-.9); c.fill(); },
  city(c){ c.fillRect(-.8,-.1,.4,.9); c.fillRect(-.32,-.75,.42,1.55); c.fillRect(.18,-.4,.32,1.2); c.fillRect(.56,.05,.26,.75); },
  uni(c){ ICONS.school(c); },
  star(c){ c.beginPath(); for (let i=0;i<10;i++){ const r = i%2 ? .36 : .85, a = -Math.PI/2 + i*Math.PI/5; c.lineTo(Math.cos(a)*r, Math.sin(a)*r); } c.closePath(); c.fill(); },
  house(c){ // roof outline + walls + window + ground swoosh, like the house marker in our finals
    c.lineWidth=.1; c.lineJoin="round"; c.lineCap="round";
    c.beginPath(); c.moveTo(-.88,-.02); c.lineTo(0,-.78); c.lineTo(.88,-.02); c.stroke();
    c.beginPath(); c.moveTo(-.62,-.16); c.lineTo(0,-.66); c.lineTo(.62,-.16); c.lineTo(.62,.44); c.lineTo(-.62,.44); c.closePath(); c.fill();
    c.fillRect(-.6,-.62,.16,.3);
    c.save(); c.globalCompositeOperation="destination-out"; const wx=.05, wy=-.08, ws=.15; c.fillRect(wx,wy,ws,ws); c.fillRect(wx+ws+.04,wy,ws,ws); c.fillRect(wx,wy+ws+.04,ws,ws); c.fillRect(wx+ws+.04,wy+ws+.04,ws,ws); c.restore();
    c.beginPath(); c.moveTo(-.95,.68); c.quadraticCurveTo(0,.4,.95,.68); c.quadraticCurveTo(0,.52,-.95,.68); c.fill();
  }
};
const CAT_ICON = { transport:"train", education:"school", health:"hospital", leisure:"pool", park:"park", playground:"sport", reserve:"pine", regional_park:"pine", lake:"lake", river:"lake", marina:"lake", beach:"sand", school:"school", university:"school", tafe:"school", childcare:"child", library:"library", aquatic:"pool", recreation:"pool", sport:"track", stadium:"stadium", shopping:"shop", regional_shopping:"shop", train:"train", bus:"bus", hospital:"hospital", medical:"medical", golf:"golf", airport:"plane", city:"city", community:"hall", landmark:"star", other:"star" };
const ICON_CHOICES = [["park","Park"],["pine","Reserve / bushland"],["picnic","Gardens / picnic"],["lake","Lake / wetland"],["sand","Beach"],["lounger","Beach / pool club"],["palm","Foreshore"],["school","School / uni"],["child","Childcare"],["library","Library"],["book","Books / learning"],["pool","Pool / leisure centre"],["swim","Swimming pool"],["sport","Playground / sport"],["track","Oval / track"],["field","Sports field"],["stadium","Stadium"],["arts","Arena / arts centre"],["racing","Racecourse"],["golf","Golf"],["shop","Shopping centre"],["mall","Shops / retail"],["bag","Shop"],["train","Train station"],["bus","Bus"],["hospital","Hospital"],["medical","Medical"],["hall","Community / hall"],["govt","Civic / government"],["civic","Town hall"],["gazebo","Pavilion"],["lookout","Lookout"],["beach","Beach (umbrella)"],["plane","Airport"],["city","City"],["star","Other"]];
const NAME_ICON = [[/golf/i,"golf"],[/racecourse|turf club|raceway/i,"racing"],[/station/i,"train"],[/hospital/i,"hospital"],[/medical|clinic|health/i,"medical"],[/library/i,"library"],[/stadium|arena/i,"stadium"],[/aquatic|leisure|recreation centre|swim/i,"pool"],[/oval|sports? ground|reserve.*oval/i,"track"],[/early learning|childcare|child care|kindergarten|kindy|daycare/i,"child"],[/school|college|university|tafe|campus|montessori|grammar/i,"school"],[/shopping|plaza|westfield|forum|centro|marketplace|shopping city|dfo|outlet|homemaker|(park|town|city|village|square|central) centre|\biga\b|woolworths|coles|aldi|foods? market|supermarket/i,"shop"],[/beach/i,"sand"],[/\blake\b|wetland|swamp|river|\bdam\b|reservoir/i,"lake"],[/foreshore/i,"palm"],[/lookout/i,"lookout"],[/playground/i,"sport"],[/early learning|childcare|child care|kindergarten|kindy|daycare/i,"child"],[/school|college|university|tafe|campus|montessori|grammar/i,"school"],[/shopping|plaza|westfield|forum|centro|marketplace|shopping city|village|dfo|outlet|homemaker|boulevard/i,"shop"],[/community centre|hall|club ?house/i,"hall"],[/gardens/i,"park"],[/bushland|nature reserve|regional park|reserve/i,"pine"],[/park/i,"park"]];
function iconForPlace(name, cat){ for (const [re, ic] of NAME_ICON) if (re.test(name||"")) return ic; return CAT_ICON[cat] || "star"; }
const _icoImg = {};
function iconImg(name){ const src = ICON_BMP[name]; if (!src) return null; let im = _icoImg[name]; if (!im){ im = _icoImg[name] = new Image(); im.onload = ()=>{ if (typeof requestDraw === "function") requestDraw(); }; im.src = src; } return im.complete && im.naturalWidth ? im : null; }
function roundRect(c,x,y,w,h,r){ r=Math.min(r,w/2,h/2); c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); }
function drawIcon(c, name, cx, cy, size, R){ if (R){ const im = iconImg(name); if (im){ const d = 2*R*.86; c.drawImage(im, cx-d/2, cy-d/2, d, d); return; } } const f = ICONS[name] || ICONS.star; c.save(); c.translate(cx,cy); c.scale(size,size); c.fillStyle="#fff"; c.strokeStyle="#fff"; f(c); c.restore(); }

// ================= pins: one preset per agency, measured from the editors' delivered finals (3000 px wide) =================
const AGENCIES = {
  "red":         { name:"Laurie Kelly — red pins (Devon, Daniel, Franklin; Cooper Winter)",            kind:"pin",  color:"#E2181C", house:{ type:"pin", w:240, h:340, mark:"house", ring:true } },
  "charcoal":    { name:"Raspa — charcoal pins (John O'Brien, Simon Raspa; Grant Wilson, Oliver Norris)", kind:"pin", color:"#3A3C40", house:{ type:"pin", w:240, h:340, mark:"house", ring:true } },
  "grey-s":      { name:"Grey pins + S logo (Kasey Summers, Semple)",               kind:"pin",  color:"#9C9C9C", house:{ type:"pin", w:255, h:360, mark:"s", markR:.9, ring:true } },
  "black-photo": { name:"Black pins + agent photo (Jayden Cooke)",          kind:"pin",  color:"#060606", house:{ type:"pin", w:236, h:330, mark:"photo", markR:.69 } },
  "navy":        { name:"Navy pins + emblem (Biljana)",                     kind:"pin",  color:"#122068", scale:.88, house:{ type:"board", w:170, h:143, stem:300, mark:"emblem" } },
  "navy-h":      { name:"Harcourts — navy pins + H board (Tim Fidock, Mario Condipodero)",          kind:"pin",  color:"#022048", house:{ type:"board", w:178, h:178, stem:240, mark:"hboard" } },
  "fn":          { name:"Blue pins + First National board (Suresh Sama, Nish Jayant)",   kind:"pin",  color:"#004480", scale:.88, house:{ type:"board", w:142, h:142, stem:250, mark:"fn" } },
  "orange":      { name:"Orange pins (Raymond Chen)",                       kind:"pin",  color:"#F4783C", scale:.88, house:{ type:"pin", w:240, h:340, mark:"house", ring:true } },
  "green-belle": { name:"Green pins + belle (Shane Garrett, Cory Garrett, Megan Topham)", kind:"pin", color:"#22644E", house:{ type:"pin", w:176, h:281, mark:"belle", markR:.91 } },
  "flags-p":     { name:"Red flags + P pin (Professionals: Annique Woodford, Nic Pulvirenti, Stephanie Briers, Emma Scharf, James Kennedy)", kind:"flag", color:"#FF2744", house:{ type:"pin", w:192, h:273, color:"#3C3C3C", mark:"p", markR:.85 } },
  "yellow":      { name:"Yellow labels + address (Gregory Swiatek, Shah Akbari)", kind:"ylab", color:"#F4DC00", house:{ type:"label" } },
  "pill-r":      { name:"Navy labels + R pin (Mandie Cubeddu)",             kind:"pill", color:"#223454", house:{ type:"pin", w:82, h:104, stem:190, mark:"r", markR:.9 } },
  "realty-plus": { name:"Realty Plus — teal pins + board (Tracy Garbes, Leonie Adam)",     kind:"pin",  color:"#7ACCD6", scale:.88, house:{ type:"board", w:220, h:183, stem:170, mark:"realty" } },
  "peard":       { name:"Navy pins + Peard board (Wesley Majeks)",          kind:"pin",  color:"#0E2357", scale:.88, house:{ type:"board", w:285, h:111, stem:160, mark:"peard" } },
  "mallison":    { name:"Navy pins + Mallison logo (Oshi Thilakarathna)",   kind:"pin",  color:"#0B2A4F", scale:.88, house:{ type:"board", w:300, h:69, stem:180, mark:"mallison" } }
};
const HOUSE_STYLES = {
  "":        { name:"Default (ring, or the agency logo)" },
  classic:   { name:"Classic pin", house:{ type:"pin", w:226, h:322, mark:"house" } },
  ring:      { name:"Pin with white ring", house:{ type:"pin", w:240, h:340, mark:"house", ring:true } },
  white:     { name:"White pin on a post", house:{ type:"pin", w:150, h:208, stem:200, mark:"house-black", color:"#FFFFFF" } },
  board:     { name:"Square sign on a post", house:{ type:"board", w:170, h:170, stem:220, mark:"houseboard" } },
  big:       { name:"Big pin", house:{ type:"pin", w:290, h:410, mark:"house" } }
};
function agency(){ const A = AGENCIES[prefs.agency] || AGENCIES.red, o = HOUSE_STYLES[prefs.houseStyle||""]; return o && o.house ? Object.assign({}, A, { house:o.house }) : A; }
function pinColour(){ return prefs.pinColor || agency().color; }
function houseColour(){ const h = agency().house; return h.color || pinColour(); }
function shade(hex, pct){ const n=parseInt(hex.slice(1),16); const f=v=>Math.max(0,Math.min(255,Math.round(v + 255*pct/100))); return `rgb(${f(n>>16&255)},${f(n>>8&255)},${f(n&255)})`; }
const _imgs = {};
function cachedImg(src){ if (!src) return null; let im = _imgs[src]; if (!im){ im = _imgs[src] = new Image(); im.onload = ()=>requestDraw(); im.src = src; } return im.complete && im.naturalWidth ? im : null; }
function logoImg(){ return cachedImg(prefs.logo); }
function markImg(){ const m = agency().house.mark; return logoImg() || (AGENCY_MARKS[m] ? cachedImg(AGENCY_MARKS[m]) : null); }
const LABEL_FONT = ()=>`"${prefs.labelFont}", "Source Sans 3", "Myriad Pro", "Segoe UI", sans-serif`;
// pin: head 141×200, label 116 tall, text 72, 34 from head edge to text, 33 right pad, corner 6, 86% white.
// flag: box 128 tall, text 52 white, pads 18/14, 9 px stem. pill: 108 tall, text 64 white, pad 39, white ring, dotted stem.
function pinGeom(p, pin){
  const A = agency(), s = p.w/3000 * (prefs.pinScale/100) * (A.scale||1);
  const house = !!pin.house, kind = house ? (A.house.type === "label" ? A.kind : "house") : A.kind;
  const g = { s, kind, house, lift:0, flip:false };
  const text = house ? houseText() : (pin.name||"");
  if (house && A.house.type !== "label"){
    const H = A.house, w = H.w*s, h = H.h*s;
    g.lift = (H.stem||0)*s + (pin.lift||0);
    if (H.type === "board"){
      g.board = true; g.box = [pin.ex - w/2, pin.ey - g.lift - h, w, h]; g.tipY = pin.ey - g.lift; g.hx = pin.ex; g.hy = g.box[1] + h/2; g.R = w/2;
    } else {
      g.mw = w; g.mh = h; g.R = w/2; g.tipY = pin.ey - g.lift; g.hx = pin.ex; g.hy = g.tipY - h + g.R; g.box = [pin.ex - g.R, g.tipY - h, w, h];
    }
    return g;
  }
  const FS = { pin:72, flag:52, pill:64, ylab:52 }[kind];
  ctx.font = `400 ${FS*s}px ${LABEL_FONT()}`;
  const tw = ctx.measureText(text).width;
  if (kind === "flag" || kind === "pill" || kind === "ylab"){
    const fh = ({ flag:128, pill:108, ylab:114 })[kind]*s, padL = ({ flag:18, pill:39, ylab:24 })[kind]*s, padR = ({ flag:14, pill:39, ylab:24 })[kind]*s, fw = padL + tw + padR;
    g.lift = ({ flag:110, pill:150, ylab:120 })[kind]*s + (pin.lift||0);
    const off = pin.off == null ? .5 : pin.off, x = pin.ex - Math.max(fh/2, Math.min(fw - fh/2, fw*off)), y = pin.ey - g.lift - fh;
    g.box = [x, y, fw, fh]; g.tipY = pin.ey - g.lift; g.flag = { x, y, w:fw, h:fh, fs:FS*s, tx:x+padL, text };
    return g;
  }
  const mw = 141*s, mh = 200*s, R = mw/2;
  g.lift = 0; g.flip = !!pin.flip; /* editors never put pins on stems */ g.mw = mw; g.mh = mh; g.R = R;
  g.tipY = g.flip ? pin.ey + g.lift : pin.ey - g.lift;
  g.hx = pin.ex; g.hy = g.flip ? g.tipY + mh - R : g.tipY - mh + R;
  g.box = [g.hx-R, g.flip ? g.tipY : g.tipY-mh, mw, mh];
  const fs = 72*s, lh = 116*s, side = ["left","top","bottom"].includes(pin.side) ? pin.side : "right";
  if (side === "top" || side === "bottom"){ // label centred over (or under) the head, the head tucked into its edge — as in the grey finals
    const lw = 33*s + tw + 33*s, lx = g.hx - lw/2, ly = side === "top" ? g.hy - R + 13*s - lh : g.hy + R - 13*s;
    g.label = { x:lx, y:ly, w:lw, h:lh, fs, side, tx: lx + 33*s };
  } else {
    const lw = R + 34*s + tw + 33*s, lx = side === "right" ? g.hx : g.hx - lw;
    g.label = { x:lx, y:g.hy - lh/2, w:lw, h:lh, fs, side, tx: side==="right" ? g.hx + R + 34*s : lx + 33*s };
  }
  return g;
}
function markerPath(c, g, tipX, tipY){
  const d = g.mh - g.R, beta = Math.acos(Math.min(1, g.R/d)), dir = g.flip ? -Math.PI/2 : Math.PI/2;
  c.beginPath(); c.moveTo(tipX, tipY);
  c.lineTo(g.hx + g.R*Math.cos(dir+beta), g.hy + g.R*Math.sin(dir+beta));
  c.arc(g.hx, g.hy, g.R, dir+beta, dir-beta+Math.PI*2, false);
  c.closePath();
}
function drawEmblem(c, x, y, w, h){ // navy / grey / teal mark, vector-traced (unit: 1 = mark height)
  c.save(); c.translate(x, y); const k = h/287; c.scale(k, k); c.translate(-145, -75);
  c.fillStyle = "#13216A"; c.beginPath(); c.moveTo(168, 100); c.arc(175, 218, 120, -1.63, 1.63, true); c.closePath(); c.fill();
  c.fillStyle = "#C7C7C7"; c.beginPath(); c.moveTo(168,104); c.lineTo(282,150); c.lineTo(282,286); c.lineTo(168,334); c.closePath(); c.fill();
  c.fillStyle = "#5AB0BD";
  c.beginPath(); c.moveTo(145,90); c.quadraticCurveTo(300,40,385,160); c.lineTo(282,160); c.lineTo(168,110); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(145,348); c.quadraticCurveTo(300,398,385,278); c.lineTo(282,278); c.lineTo(168,328); c.closePath(); c.fill();
  c.restore();
}
function drawHBoard(c, x, y, w, h){
  c.fillStyle = "#002049"; c.fillRect(x, y, w, h);
  c.fillStyle = "#fff"; const sw = w*.1;
  c.fillRect(x+w*.31, y+h*.2, sw, h*.44); c.fillRect(x+w*.67-sw, y+h*.2, sw, h*.44); c.fillRect(x+w*.31, y+h*.39, w*.36, h*.085);
  c.fillStyle = "#03ABF2"; c.fillRect(x+w*.31, y+h*.71, w*.36, h*.085);
}
function houseText(){ return job && job.address ? job.address.replace(/,\s*Australia\s*$/i,"").replace(/\s+\d{4}\s*$/,m=>m) : "The property"; }
function drawHouseGlyph(c, cx, cy, size, col){ // solid home glyph (roof, chimney, body with door)
  c.save(); c.translate(cx, cy); c.scale(size, size); c.fillStyle = col;
  c.beginPath(); c.moveTo(0,-.82); c.lineTo(.92,.02); c.lineTo(.74,.2); c.lineTo(0,-.46); c.lineTo(-.74,.2); c.lineTo(-.92,.02); c.closePath(); c.fill();
  c.fillRect(.42,-.72,.2,.4);
  c.beginPath(); c.moveTo(0,-.32); c.lineTo(.62,.24); c.lineTo(.62,.82); c.lineTo(.16,.82); c.lineTo(.16,.36); c.lineTo(-.16,.36); c.lineTo(-.16,.82); c.lineTo(-.62,.82); c.lineTo(-.62,.24); c.closePath(); c.fill();
  c.restore();
}
function drawHouse(c, p, pin, g){
  const A = agency(), H = A.house;
  if (g.flag) return drawBoxLabel(c, pin, g, A);
  if (g.lift > 1){ // stem down to the exact spot
    if (A.kind === "pill"){ dottedStem(c, pin.ex, pin.ey, g.tipY, g.s); }
    else { c.fillStyle = "#fff"; c.fillRect(pin.ex - 4.5*g.s, g.tipY - 2, 9*g.s, pin.ey - g.tipY + 2); }
  }
  const img = markImg();
  if (g.board){
    const [x,y,w,h] = g.box;
    if (img) c.drawImage(img, x, y, w, h);
    else if (H.mark === "emblem") drawEmblem(c, x - w*.08, y, w, h);
    else if (H.mark === "houseboard"){ c.save(); c.shadowColor = "rgba(0,0,0,.3)"; c.shadowBlur = 8*g.s; c.shadowOffsetY = 3*g.s; roundRect(c, x, y, w, h, 10*g.s); c.fillStyle = pinColour(); c.fill(); c.restore(); c.strokeStyle = "#fff"; c.lineWidth = 6*g.s; roundRect(c, x+9*g.s, y+9*g.s, w-18*g.s, h-18*g.s, 6*g.s); c.stroke(); drawIcon(c, "house", x+w/2, y+h/2, w*.38); }
    else drawHBoard(c, x, y, w, h);
    return;
  }
  c.save(); c.shadowColor = "rgba(0,0,0,.35)"; c.shadowBlur = 10*g.s; c.shadowOffsetX = 2*g.s; c.shadowOffsetY = 4*g.s;
  c.fillStyle = houseColour(); markerPath(c, g, pin.ex, g.tipY); c.fill(); c.restore();
  if (H.ring){ c.strokeStyle = "#fff"; c.lineWidth = g.R*.065; c.beginPath(); c.arc(g.hx, g.hy, g.R*.955, 0, 7); c.stroke(); }
  if (H.mark === "house-black" && !logoImg()){ drawHouseGlyph(c, g.hx, g.hy - g.R*.04, g.R*.6, "#111"); return; }
  if (img){
    const r = g.R*(logoImg() ? .8 : (H.markR||.85));
    c.save(); c.beginPath(); c.arc(g.hx, g.hy, r, 0, 7); c.clip();
    const k = Math.max(2*r/img.width, 2*r/img.height); c.drawImage(img, g.hx - img.width*k/2, g.hy - img.height*k/2, img.width*k, img.height*k); c.restore();
    if (H.mark === "photo" && !logoImg()){ c.strokeStyle = "#fff"; c.lineWidth = 3*g.s; c.beginPath(); c.arc(g.hx, g.hy, r, 0, 7); c.stroke(); }
  } else drawIcon(c, "house", g.hx, g.hy, g.R*.72);
}
function dottedStem(c, x, y0, y1, s){
  c.fillStyle = "#fff"; const step = 23*s;
  for (let y = y1 + step*.6; y < y0 - 18*s; y += step){ c.beginPath(); c.arc(x, y, 6*s, 0, 7); c.fill(); }
  c.beginPath(); c.arc(x, y0, 15*s, 0, 7); c.fill(); c.fillStyle = pinColour(); c.beginPath(); c.arc(x, y0, 11*s, 0, 7); c.fill();
}
function drawBoxLabel(c, pin, g, A){
  const F = g.flag, col = pinColour();
  if (A.kind === "flag"){
    c.fillStyle = col; c.fillRect(pin.ex - 4.5*g.s, F.y + F.h, 9*g.s, pin.ey - F.y - F.h);
    c.save(); c.shadowColor = "rgba(0,0,0,.45)"; c.shadowBlur = 6*g.s; c.shadowOffsetX = 3*g.s; c.shadowOffsetY = 3*g.s;
    c.fillRect(F.x, F.y, F.w, F.h); c.restore(); c.fillStyle = "#fff";
  } else if (A.kind === "ylab"){
    c.fillStyle = "#fff"; c.fillRect(pin.ex - 3.5*g.s, F.y + F.h, 7*g.s, pin.ey - F.y - F.h);
    c.beginPath(); c.arc(pin.ex, pin.ey, 16*g.s, 0, 7); c.fill(); c.fillStyle = col; c.beginPath(); c.arc(pin.ex, pin.ey, 12.5*g.s, 0, 7); c.fill();
    c.save(); c.shadowColor = "rgba(0,0,0,.3)"; c.shadowBlur = 6*g.s; c.shadowOffsetY = 2*g.s;
    roundRect(c, F.x, F.y, F.w, F.h, 11*g.s); c.fillStyle = "#fff"; c.fill(); c.restore();
    roundRect(c, F.x+5*g.s, F.y+5*g.s, F.w-10*g.s, F.h-10*g.s, 7*g.s); c.fillStyle = col; c.fill(); c.fillStyle = "#111";
  } else {
    dottedStem(c, pin.ex, pin.ey, F.y + F.h, g.s);
    roundRect(c, F.x, F.y, F.w, F.h, F.h/2); c.fillStyle = col; c.fill();
    c.strokeStyle = "#fff"; c.lineWidth = 4*g.s; roundRect(c, F.x+5*g.s, F.y+5*g.s, F.w-10*g.s, F.h-10*g.s, F.h/2-5*g.s); c.stroke(); c.fillStyle = "#fff";
  }
  c.textBaseline = "middle"; c.textAlign = "left"; c.font = `400 ${F.fs}px ${LABEL_FONT()}`;
  c.fillText(F.text, F.tx, F.y + F.h/2 + F.fs*0.03);
}
function drawPins(c, p){
  const A = agency();
  const list = p.pins.slice().sort((a,b)=>(a.house?1:0)-(b.house?1:0) || a.ey-b.ey);
  for (const pin of list){
    const g = pinGeom(p, pin);
    c.save();
    if (pin.house){ drawHouse(c, p, pin, g); c.restore(); continue; }
    const col = pinColour();
    if (g.flag){ drawBoxLabel(c, pin, g, A); c.restore(); continue; }
    const L = g.label;
    c.fillStyle = `rgba(255,255,255,${prefs.labelOpacity/100})`;
    roundRect(c, L.x, L.y, L.w, L.h, 6*g.s); c.fill();
    c.fillStyle = "#000"; c.textBaseline = "middle"; c.textAlign = "left"; c.font = `400 ${L.fs}px ${LABEL_FONT()}`;
    c.fillText(pin.name||"", L.tx, L.y + L.h/2 + L.fs*0.03);
    c.fillStyle = col;
    if (g.lift > 1){ c.fillRect(pin.ex - 3*g.s, Math.min(pin.ey, g.tipY), 6*g.s, Math.abs(pin.ey - g.tipY)); c.beginPath(); c.arc(pin.ex, pin.ey, 9*g.s, 0, 7); c.fill(); }
    c.save(); c.shadowColor = "rgba(0,0,0,.35)"; c.shadowBlur = 8*g.s; c.shadowOffsetX = 2*g.s; c.shadowOffsetY = 3*g.s;
    markerPath(c, g, pin.ex, g.tipY); c.fill(); c.restore();
    drawIcon(c, pin.icon || "star", g.hx, g.hy, g.R*.82, g.R);
    c.restore();
  }
}
function pinHit(p, pin, pt, tol){
  const g = pinGeom(p, pin), b = g.box;
  if (pt[0]>=b[0]-tol && pt[0]<=b[0]+b[2]+tol && pt[1]>=b[1]-tol && pt[1]<=b[1]+b[3]+tol) return true;
  const L = g.label; return !!L && pt[0]>=L.x-tol && pt[0]<=L.x+L.w+tol && pt[1]>=L.y-tol && pt[1]<=L.y+L.h+tol;
}
function pinRect(p, pin){ const g = pinGeom(p, pin); let x0=g.box[0], y0=Math.min(g.box[1], pin.ey), x1=x0+g.box[2], y1=Math.max(g.box[1]+g.box[3], pin.ey); if (g.label){ x0=Math.min(x0,g.label.x); x1=Math.max(x1,g.label.x+g.label.w); y0=Math.min(y0,g.label.y); y1=Math.max(y1,g.label.y+g.label.h); } return [x0,y0,x1,y1]; }
// Auto layout: keep every point exact; pick the label side, and lift crowded pins on a stem so nothing overlaps.
function pinParts(p, pin){ // marker+label box, plus the stem as a thin box
  const g = pinGeom(p, pin); let x0=g.box[0], y0=g.box[1], x1=x0+g.box[2], y1=y0+g.box[3];
  if (g.label){ x0=Math.min(x0,g.label.x); x1=Math.max(x1,g.label.x+g.label.w); y0=Math.min(y0,g.label.y); y1=Math.max(y1,g.label.y+g.label.h); }
  const parts = [[x0,y0,x1,y1]];
  if (g.lift > 1 || Math.abs(pin.ey-g.tipY) > 4) parts.push([pin.ex-10*g.s, Math.min(pin.ey,g.tipY), pin.ex+10*g.s, Math.max(pin.ey,g.tipY)]);
  return parts;
}
function tidySides(p){
  const A = agency(), s = p.w/3000*(prefs.pinScale/100)*(A.scale||1), step = 115*s, gap = 12*s, boxed = A.kind !== "pin";
  const house = p.pins.find(x=>x.house);
  const list = p.pins.filter(x=>!x.house).sort((a,b)=>a.ey-b.ey);   // farthest (top of frame) first: they have the least room
  const ov = (r,q) => { const ox = Math.min(r[2],q[2])-Math.max(r[0],q[0])+gap, oy = Math.min(r[3],q[3])-Math.max(r[1],q[1])+gap; return ox>0 && oy>0 ? ox*oy : 0; };
  const K = boxed ? 16 : 1, st = boxed ? 70*s : step;
  const place = (pin, others) => {
    let best = null;
    for (let k=0;k<K;k++) for (const flip of [false]) for (const side of (boxed ? [.5,.25,.75,.08,.92] : pin.sideLocked ? [pin.side] : ["right","left"])){
      if (boxed){ pin.off = side; pin.side = "right"; } else pin.side = side;
      pin.flip = flip; pin.lift = k*st;
      const parts = pinParts(p,pin), r = parts[0];
      const mg = 10*s, off = Math.max(0, mg-r[0]) + Math.max(0, r[2]-(p.w-mg)) + Math.max(0, mg-r[1]) + Math.max(0, r[3]-(p.h-mg));
      let o = 0; for (const q of others) for (const a of parts) for (const b of q) o += ov(a,b);
      const score = off*20000 + o*8 + (k*(boxed?3000:9000) + (flip?5000:0))*s*s + (side==="top"||side==="bottom"?2500*s*s:0) + (!boxed && side!==(pin.ex > p.w*0.68 ? "left" : "right") ? 6000*s*s : 0) + (boxed && side!==.5 ? 4000*s*s : 0);
      if (!best || score < best.score) best = { side, flip, lift:pin.lift, score };
    }
    if (boxed){ pin.off = best.side; pin.side = "right"; } else pin.side = best.side;
    pin.flip = best.flip; pin.lift = best.lift;
  };
  const done = house ? [house] : [];
  for (const pin of list){ if (!pin.layoutLocked) place(pin, done.map(q=>pinParts(p,q))); done.push(pin); }
  for (let it=0; it<2; it++) for (const pin of list){ if (pin.layoutLocked) continue; place(pin, p.pins.filter(q=>q!==pin).map(q=>pinParts(p,q))); }
  // flag anything still overlapping so the editor can drop a place (the finals never have overlapping labels)
  p.pins.forEach(a=>{ a.clash = false; if (!a.house){ const m = 0.012*p.h; for (const r of pinParts(p,a)) if (r[0] < m || r[2] > p.w-m || r[1] < 1.6*m) a.clash = true; } });   // any part touching the frame edge counts as a clash   // label hanging off the frame counts as a clash too
  for (const a of p.pins) for (const b of p.pins){ if (a===b) continue; let o=0; for (const x of pinParts(p,a)) for (const y of pinParts(p,b)) { const ox = Math.min(x[2],y[2])-Math.max(x[0],y[0]), oy = Math.min(x[3],y[3])-Math.max(x[1],y[1]); if (ox > -30*s && oy > -30*s) o++; } if (o){ a.clash = b.clash = true; } }
}

// ================= scene =================
function hexA(hex, a){ const n=parseInt(hex.slice(1),16); return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`; }
// area label: "560m2" / "560m²" → big "560m" + small raised "2"
const AREA_FONT = '"Open Sans", "Segoe UI", sans-serif';   // matches Jason's 560m2 reference
function areaSplit(txt, sup){ if (!sup) return [String(txt||" ").replace(/m2$/,"m\u00B2"), ""]; const m = String(txt||"").match(/^(.*?m)(2|²)$/); return m ? [m[1], "2"] : [String(txt||" "), ""]; }
function areaWidth(c, txt, size, weight, sup){ const [a,b] = areaSplit(txt, sup); c.font = `${weight} ${size}px ${AREA_FONT}`; let w = c.measureText(a).width;
  if (b){ c.font = `${weight} ${size*0.42}px ${AREA_FONT}`; w += size*0.03 + c.measureText(b).width; } return w; }
function textMetrics(c, t, p){
  const s = p.w/3000, size = t.size*s;
  const weight = t.style==="area" ? (t.weight||700) : t.bold ? 700 : 400;
  c.font = `${weight} ${size}px ${t.style==="area" ? AREA_FONT : '"Source Sans 3", "Segoe UI", sans-serif'}`;
  const lines = String(t.text||" ").split("\n"), lh = size*1.12;
  let w=0; lines.forEach(l=>{ w=Math.max(w, t.style==="area" ? areaWidth(c,l,size,weight,t.sup) : c.measureText(l).width); }); c.font = `${weight} ${size}px ${t.style==="area" ? AREA_FONT : '"Source Sans 3", "Segoe UI", sans-serif'}`;
  const padX = t.style==="pill" ? size*.55 : 0, padY = t.style==="pill" ? size*.3 : 0;
  const bw = w+padX*2, bh = lines.length*lh + padY*2;
  return { size, weight, lines, lh, bw, bh, x:t.x-bw/2, y:t.y-bh/2, padX, padY };
}
const ADJ0 = { exp:0, con:0, hl:0, sh:0, warm:0, tint:0, sat:0 };
function adjActive(a){ return a && Object.keys(ADJ0).some(k=>a[k]); }
// Photo-only adjustments: applied to the picture underneath; pins, boundaries and text are drawn on top afterwards, untouched.
function adjustedCanvas(src, a){
  const w=src.width, h=src.height, c=document.createElement("canvas"); c.width=w; c.height=h; const x=c.getContext("2d"); x.drawImage(src,0,0);
  const id=x.getImageData(0,0,w,h), d=id.data, cl=v=>v<0?0:v>255?255:v;
  const ex=Math.pow(2,a.exp/100), con=1+a.con/100, hl=a.hl/100, sh=a.sh/100, sat=1+a.sat/100;
  const T=new Float32Array(256);
  for (let v=0;v<256;v++){ let t=v/255; t=Math.min(1,t*ex); t=0.5+(t-0.5)*con; t=Math.max(0,Math.min(1,t));
    const wh=t*t*(3-2*t); t = t + sh*(1-wh)*t*(1-t)*1.6 + hl*wh*t*(1-t)*1.6; T[v]=cl(t*255); }
  const wr=1+a.warm/400, wb=1-a.warm/400, tg=1-a.tint/400;
  for (let i=0;i<d.length;i+=4){ let r=T[d[i]]*wr, g=T[d[i+1]]*tg, b=T[d[i+2]]*wb; const Y=.299*r+.587*g+.114*b; d[i]=cl(Y+(r-Y)*sat); d[i+1]=cl(Y+(g-Y)*sat); d[i+2]=cl(Y+(b-Y)*sat); }
  x.putImageData(id,0,0); return c;
}
function photoImage(p, before){
  const src = (!before && p.finishOn && p.fin) ? p.fin : p.base;
  if (before || !adjActive(p.adj)) return src;
  const key = JSON.stringify(p.adj) + (src===p.fin ? "f"+(p.finKey||"") : "b");
  if (!p._adj || p._adjKey !== key){ p._adj = adjustedCanvas(src, p.adj); p._adjKey = key; }
  return p._adj;
}
function blurredCopy(img, w, h, amt, sigma){
  if (sigma){ try{ const pad=Math.ceil(sigma*3), c=document.createElement("canvas"); c.width=w; c.height=h; const x=c.getContext("2d");
      if ("filter" in x){ const t=document.createElement("canvas"); t.width=w+2*pad; t.height=h+2*pad; const tx=t.getContext("2d");
        tx.drawImage(img,pad,pad,w,h); tx.drawImage(img,0,0,1,h,0,pad,pad,h); tx.drawImage(img,w-1,0,1,h,w+pad,pad,pad,h); tx.drawImage(t,pad,pad,w,1,pad,0,w,pad); tx.drawImage(t,pad,pad+h-1,w,1,pad,h+pad,w,pad);   // edge-extend so borders don't go dark
        x.filter=`blur(${sigma}px)`; x.drawImage(t,-pad,-pad); x.filter="none"; return c; } }catch(e){} } // cheap, cross-browser blur: shrink then scale back up twice
  const f = Math.max(2, amt/4);
  const a = document.createElement("canvas"); a.width = Math.max(1,Math.round(w/f)); a.height = Math.max(1,Math.round(h/f));
  const ax = a.getContext("2d"); ax.imageSmoothingQuality="high"; ax.drawImage(img,0,0,a.width,a.height);
  const b = document.createElement("canvas"); b.width = Math.max(1,Math.round(w/(f/2))); b.height = Math.max(1,Math.round(h/(f/2)));
  const bx = b.getContext("2d"); bx.imageSmoothingQuality="high"; bx.drawImage(a,0,0,b.width,b.height);
  return b;
}
function drawScene(c, p, opt){
  const img = photoImage(p, opt.before);
  c.drawImage(img, 0, 0, p.w, p.h);
  if (opt.hide) return;
  const s = p.w/3000;
  const polys = p.shapes.filter(x=>x.type==="poly" && x.pts.length>=3);
  if (polys.length){   // a boundary photo is always blurred outside the lot
    c.save(); c.beginPath(); c.rect(0,0,p.w,p.h);
    polys.forEach(sh=>{ c.moveTo(sh.pts[0][0],sh.pts[0][1]); for(let i=1;i<sh.pts.length;i++) c.lineTo(sh.pts[i][0],sh.pts[i][1]); c.closePath(); });
    c.clip("evenodd");
    { const key = (opt.before?"b":"a") + p.blurAmt + (p.finishOn?"f":"") + (p._adjKey||"");
      const cr = lotCrop(p), fw = cr ? cr[2] : p.w, sig = fw * 0.0028 * Math.max(35, p.blurAmt||45) / 45;   // ~0.28% of the delivered frame width, smooth gaussian (matches Jason's reference)
      if (!p._blur || p._blurKey !== key + "|" + Math.round(sig)){ p._blur = blurredCopy(img, p.w, p.h, Math.max(35, p.blurAmt||45)*s, sig); p._blurKey = key + "|" + Math.round(sig); }
      c.drawImage(p._blur, 0, 0, p.w, p.h);
    }
    c.restore();
  }
  for (const sh of p.shapes){
    if (sh.pts.length<2) continue;
    const w = sh.width*s*3, edges = edgesOf(sh);   // width is per-1000 of 3000 px → ×3
    c.save(); c.strokeStyle = sh.color; c.lineWidth = w; c.lineJoin = "miter"; c.lineCap = "square";
    edges.forEach((e,i)=>{ const dashed = !!(sh.dashed && sh.dashed[i]); c.setLineDash(dashed ? [w*3,w*2.2] : []); c.lineCap = dashed ? "butt" : "square"; c.beginPath(); c.moveTo(e[0][0],e[0][1]); c.lineTo(e[1][0],e[1][1]); c.stroke(); });
    c.restore();
    if (sh.type==="poly" && sh.showLens && sh.lens) drawEdgeLengths(c, p, sh, s);
  }
  for (const t of p.texts){
    if (t.style==="area"){
      const sh = p.shapes.find(x=>x.id===t.link);
      if (sh && t.autoSize !== false) fitAreaText(c, p, t, sh);
    }
    const m = textMetrics(c, t, p);
    c.save(); c.textBaseline="middle"; c.textAlign="center";
    if (t.style==="pill"){ c.fillStyle=t.bg; roundRect(c, m.x, m.y, m.bw, m.bh, m.size*.18); c.fill(); }
    c.font = `${m.weight} ${m.size}px ${t.style==="area" ? AREA_FONT : '"Source Sans 3", "Segoe UI", sans-serif'}`;
    m.lines.forEach((l,i)=>{
      const ly = m.y + m.padY + m.lh*(i+.5);
      if (t.style!=="pill"){ c.shadowColor="rgba(0,0,0,.45)"; c.shadowBlur=m.size*(t.style==="area"?.06:.18); c.shadowOffsetY=m.size*.02; }
      c.globalAlpha = t.style==="area" ? 0.95 : 1;
      c.fillStyle=t.color;
      if (t.style==="area"){ const [a,b] = areaSplit(l, t.sup); if (b){ const W = areaWidth(c,l,m.size,m.weight,true); c.textAlign="left"; c.font=`${m.weight} ${m.size}px ${AREA_FONT}`; const wa=c.measureText(a).width, x0=t.x-W/2; c.fillText(a, x0, ly);
          c.font=`${m.weight} ${m.size*0.42}px ${AREA_FONT}`; c.fillText(b, x0+wa+m.size*0.03, ly - m.size*0.24); c.textAlign="center"; } else c.fillText(a, t.x, ly); }
      else c.fillText(l, t.x, ly);
    });
    c.restore();
  }
  drawPins(c, p);
  if (p.disc.on && p.disc.text.trim() && p.shapes.length){
    const fs = Math.max(10, 30*s);
    c.save(); c.font=`400 ${fs}px "Source Sans 3", sans-serif`; c.textBaseline="bottom"; c.textAlign="left";
    c.shadowColor="rgba(0,0,0,.8)"; c.shadowBlur=fs*.4; c.fillStyle="rgba(255,255,255,.92)";
    c.fillText(p.disc.text.trim(), 40*s, p.h-30*s); c.restore();
  }
}
function fitAreaText(c, p, t, sh){
  const pts = sh.pts; let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity; pts.forEach(q=>{x0=Math.min(x0,q[0]);x1=Math.max(x1,q[0]);y0=Math.min(y0,q[1]);y1=Math.max(y1,q[1]);});
  const s = p.w/3000; const bw = x1-x0, bh = y1-y0;
  const w100 = areaWidth(c, t.text||" ", 100, t.weight||700, t.sup) || 1;
  const byW = (t.fitW||0.5)*bw/w100*100, byH = (t.fitH||0.55)*bh;
  t.size = Math.max(20, Math.min(byW, byH)/s);
  if (!t.moved){ const ct = centroid(pts); t.x = ct[0]; t.y = ct[1]; }
}
function drawEdgeLengths(c, p, sh, s){
  const fs = 62*s*(sh.lensScale||1), ct = centroid(sh.pts);
  edgesOf(sh).forEach((e,i)=>{
    const txt = (sh.lens[i]||"").trim(); if (!txt) return;
    const mx=(e[0][0]+e[1][0])/2, my=(e[0][1]+e[1][1])/2;
    let ang = Math.atan2(e[1][1]-e[0][1], e[1][0]-e[0][0]);
    let nx = -(e[1][1]-e[0][1]), ny = (e[1][0]-e[0][0]); const nl = Math.hypot(nx,ny)||1; nx/=nl; ny/=nl;
    if ((ct[0]-mx)*nx + (ct[1]-my)*ny > 0){ nx=-nx; ny=-ny; }     // point outward
    if (ang > Math.PI/2) ang -= Math.PI; if (ang < -Math.PI/2) ang += Math.PI;
    if (Math.abs(Math.abs(ang) - Math.PI/2) < 0.35){                // near-vertical: text top faces outward
      ang = nx < 0 ? -Math.PI/2 : Math.PI/2;
    }
    const off = fs*0.85 + sh.width*s*1.5;
    c.save(); c.translate(mx + nx*off, my + ny*off); c.rotate(ang);
    c.font = `${sh.lensWeight||400} ${fs}px ${AREA_FONT}`; c.textAlign="center"; c.textBaseline="middle";
    c.shadowColor="rgba(0,0,0,.7)"; c.shadowBlur=fs*.25; c.fillStyle="#fff"; c.fillText(txt, 0, 0); c.restore();
  });
}

// 3:2 export box for a boundary photo shot at 4:3: frames the lot (same rule as the auto edit)
function lotCrop(p){
  const polys = p.shapes.filter(x=>x.type==="poly" && x.pts.length>=3); if (!polys.length || Math.abs(p.w/p.h-1.5) < 0.01) return null;
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9; polys.forEach(sh=>sh.pts.forEach(q=>{ x0=Math.min(x0,q[0]); y0=Math.min(y0,q[1]); x1=Math.max(x1,q[0]); y1=Math.max(y1,q[1]); }));
  const bw=x1-x0, bh=y1-y0; let cw=Math.max(bw/0.6, bh*1.5/0.56); cw=Math.min(cw, p.w, p.h*1.5); cw=Math.max(cw, Math.min(p.w, p.h*1.5)*0.3); const ch=cw/1.5;
  let cx=(x0+x1)/2-cw/2, cy=(y0+y1)/2-ch/2; cx=Math.max(0,Math.min(p.w-cw,cx)); cy=Math.max(0,Math.min(p.h-ch,cy)); return [cx,cy,cw,ch];
}
