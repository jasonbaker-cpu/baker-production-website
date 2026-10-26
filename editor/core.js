"use strict";
// ================= storage =================
const LS = {
  get(k, d){ try{ const v = localStorage.getItem("bae:"+k); return v==null ? d : JSON.parse(v); }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem("bae:"+k, JSON.stringify(v)); }catch(e){} }
};
const BAKER_RED = "#e11a1d";
const DEFAULT_DISC = "Boundary lines are approximate and for illustration only.";
const prefs = Object.assign({
  outMode:"finals",            // finals = 3:2 centre crop, 3000 px wide (matches delivered aerials) | full
  finish:true, sky:true,
  agency:"red", pinColor:"", pinScale:100, labelOpacity:86, labelFont:"Source Sans 3", logo:"",
  lineColor:BAKER_RED, lineWidth:6.7, outside:"blur", blurAmt:45, darkAmt:35,
  discOn:false, discText:DEFAULT_DISC
}, LS.get("prefs", {}));
if (prefs.pinStyle !== undefined || prefs.v !== 2){ delete prefs.pinStyle; prefs.pinColor = ""; prefs.labelOpacity = 86; prefs.agency = prefs.agency || "red"; prefs.v = 2; }  // old grey/red looks retired
prefs.skyPlate = "C"; prefs.sky = true;   // 26 Oct: Baker skies are always pale-blue C; a plate picked in an old session never carries over
const savePrefs = () => LS.set("prefs", prefs);
let templates = LS.get("templates", {});

// ================= state =================
let photos = [];
let cur = -1;
let tool = "select";
let sel = null;           // {kind:'pin'|'shape'|'text', id, edge?, vtx?}
let draft = null;
let hover = null;
let hideGfx = false;
let showBefore = false;
let view = { s:1, tx:0, ty:0 };
let userMoved = false;
let job = null;           // {address, lat, lng, places:[...], sample}
let armed = null;         // {kind:'house'|'landmark'|'place'|'custom', key?}
let ptab = LS.get("ptab", "pins");
let uid = 1;
const nid = () => "o" + (uid++);
const P = () => photos[cur];

// ================= geometry =================
const DEG = Math.PI/180;
const DIRS = ["N","NE","E","SE","S","SW","W","NW"];
const dist = (a,b) => Math.hypot(a[0]-b[0], a[1]-b[1]);
function distSeg(p,a,b){ const dx=b[0]-a[0], dy=b[1]-a[1]; const L=dx*dx+dy*dy; let t=L?((p[0]-a[0])*dx+(p[1]-a[1])*dy)/L:0; t=Math.max(0,Math.min(1,t)); return Math.hypot(p[0]-(a[0]+t*dx), p[1]-(a[1]+t*dy)); }
function inPoly(p, pts){ let c=false; for(let i=0,j=pts.length-1;i<pts.length;j=i++){ const a=pts[i],b=pts[j]; if(((a[1]>p[1])!==(b[1]>p[1])) && (p[0] < (b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])) c=!c; } return c; }
function centroid(pts){ let a=0,cx=0,cy=0; for(let i=0,j=pts.length-1;i<pts.length;j=i++){ const f=pts[j][0]*pts[i][1]-pts[i][0]*pts[j][1]; a+=f; cx+=(pts[j][0]+pts[i][0])*f; cy+=(pts[j][1]+pts[i][1])*f; } if(Math.abs(a)<1e-6){ let x=0,y=0; pts.forEach(q=>{x+=q[0];y+=q[1];}); return [x/pts.length,y/pts.length]; } return [cx/(3*a), cy/(3*a)]; }
function polyArea(pts){ let a=0; for(let i=0,j=pts.length-1;i<pts.length;j=i++) a+=pts[j][0]*pts[i][1]-pts[i][0]*pts[j][1]; return Math.abs(a/2); }
function edgesOf(sh){ const n=sh.pts.length; const m = sh.type==="poly" ? n : n-1; const out=[]; for(let i=0;i<m;i++) out.push([sh.pts[i], sh.pts[(i+1)%n]]); return out; }
function geoDist(lat0, lng0, lat, lng){
  const dy = (lat-lat0)*111320, dx = (lng-lng0)*111320*Math.cos(lat0*DEG);
  const d = Math.hypot(dx,dy), b = (Math.atan2(dx,dy)/DEG + 360) % 360;
  return { d, b, dir: DIRS[Math.floor((b+22.5)/45) % 8] };
}
function fmtDist(d){ return d < 1000 ? `${Math.max(10, Math.round(d/10)*10)} m` : `${(d/1000).toFixed(1)} km`; }

// ================= camera =================
// Projection works in ORIGINAL photo pixels (ow × oh); p.k / p.x0 / p.y0 map to the working image.
// cam: {lat,lng,h (m above ground), yaw (° from north), pitch (°, -90 = straight down), roll (°), f35}
function projectOrig(cam, W, H, lat, lng){
  const c0 = Math.cos(cam.lat*DEG);
  const vx = (lng-cam.lng)*111320*c0, vy = (lat-cam.lat)*111320, vz = -cam.h;
  const yw = cam.yaw*DEG, pt = cam.pitch*DEG;
  const f = [Math.sin(yw)*Math.cos(pt), Math.cos(yw)*Math.cos(pt), Math.sin(pt)];
  const r = [Math.cos(yw), -Math.sin(yw), 0];
  const u = [r[1]*f[2]-r[2]*f[1], r[2]*f[0]-r[0]*f[2], r[0]*f[1]-r[1]*f[0]];
  const xc = vx*r[0]+vy*r[1]+vz*r[2], yc = vx*u[0]+vy*u[1]+vz*u[2], zc = vx*f[0]+vy*f[1]+vz*f[2];
  if (zc <= 0.5) return null;
  const fpx = cam.f35*Math.hypot(W,H)/43.27;
  let dx = fpx*xc/zc, dy = -fpx*yc/zc;
  const rl = (cam.roll||0)*DEG;
  if (rl){ const c=Math.cos(rl), s=Math.sin(rl); const x2 = dx*c - dy*s, y2 = dx*s + dy*c; dx=x2; dy=y2; }
  return [W/2 + dx, H/2 + dy];
}
const toWork = (p, q) => q && [(q[0]-p.x0)*p.k, (q[1]-p.y0)*p.k];
const toOrig = (p, q) => [q[0]/p.k + p.x0, q[1]/p.k + p.y0];
function projectW(p, lat, lng){ if (!p.cam || !p.cam.ready) return null; return toWork(p, projectOrig(p.cam, p.ow, p.oh, lat, lng)); }
function inFrame(p, q, m){ m = m||0; return !!q && q[0] >= -m && q[0] <= p.w+m && q[1] >= -m && q[1] <= p.h+m; }
// Least-squares camera fit to clicked anchors {lat,lng,ox,oy} (original px).
function solveCam(p, free){
  const cam = Object.assign({}, p.cam), A = p.anchors;
  // With a landmark clicked, the house counts less: the address point can sit ~10 m from the roof, which
  // skews the heading by 2–3°. The far landmark sets the heading; the house still pins down height and tilt.
  const wt = a => (A.length >= 2 && a.key === "__house") ? 0.3 : 1;
  const resid = c => { const out=[]; for (const a of A){ const q = projectOrig(c, p.ow, p.oh, a.lat, a.lng); if (!q) return null; const w = wt(a); out.push((a.ox-q[0])*w, (a.oy-q[1])*w); } return out; };
  const step = { yaw:0.01, pitch:0.01, roll:0.01, h:0.2 };
  const clampStep = { yaw:8, pitch:6, roll:3, h:25 };
  for (let it=0; it<120; it++){
    const r = resid(cam); if (!r) return null;
    const J = free.map(k => { const c2 = Object.assign({}, cam); c2[k] += step[k]; const r2 = resid(c2); if (!r2) return null; return r.map((v,i)=>(v - r2[i])/step[k]); });
    if (J.some(x=>!x)) return null;
    const n = free.length, M = Array.from({length:n},()=>new Array(n).fill(0)), g = new Array(n).fill(0);
    for (let i=0;i<n;i++){ for (let j=0;j<n;j++) for (let t=0;t<r.length;t++) M[i][j]+=J[i][t]*J[j][t]; for (let t=0;t<r.length;t++) g[i]+=J[i][t]*r[t]; M[i][i] += 1e-6*(M[i][i]+1); }
    const d = gauss(M, g); if (!d) return null;
    let big = 0;
    free.forEach((k,i)=>{ const v = Math.max(-clampStep[k], Math.min(clampStep[k], d[i])); cam[k] += v; big = Math.max(big, Math.abs(v)); });
    cam.h = Math.max(5, Math.min(500, cam.h)); cam.pitch = Math.max(-90, Math.min(5, cam.pitch));
    if (big < 1e-5) break;
  }
  const r = resid(cam); if (!r) return null;
  let e = 0; for (let i=0;i<r.length;i+=2) e = Math.max(e, Math.hypot(r[i], r[i+1]));
  cam.err = e*p.k;  // worst miss in working px (house weighted)
  return cam;
}
function gauss(M, b){
  const n=b.length, A=M.map((r,i)=>r.concat([b[i]]));
  for (let i=0;i<n;i++){ let m=i; for (let j=i+1;j<n;j++) if (Math.abs(A[j][i])>Math.abs(A[m][i])) m=j; [A[i],A[m]]=[A[m],A[i]]; if (Math.abs(A[i][i])<1e-12) return null; for (let j=i+1;j<n;j++){ const f=A[j][i]/A[i][i]; for (let k=i;k<=n;k++) A[j][k]-=f*A[i][k]; } }
  const x=new Array(n); for (let i=n-1;i>=0;i--){ let s=A[i][n]; for (let k=i+1;k<n;k++) s-=A[i][k]*x[k]; x[i]=s/A[i][i]; } return x;
}
// Re-solve after the editor clicks the house and/or landmarks.
function realign(p){
  if (!p.cam) return false;
  const c = p.cam;
  if (!p.anchors.length){ if (!c.fromGimbal) c.ready = false; return true; }
  if (!c.ready){ // first solve: aim at the anchor, start from a sensible height
    const a = p.anchors[0], g = geoDist(c.lat, c.lng, a.lat, a.lng);
    c.yaw = g.b; if (!c.fromGimbal){ c.h = c.h0; c.pitch = p.horizon ? p.horizon.pitch : -Math.atan2(c.h, Math.max(g.d,1))/DEG; c.roll = p.horizon ? p.horizon.roll : 0; }
    c.ready = true;
  }
  let free;
  if (p.anchors.length >= 3) free = ["yaw","pitch","h","roll"];
  else if (p.anchors.length === 2) free = ["yaw","pitch","h"];
  else if (c.fromGimbal) free = ["yaw","pitch"];
  else if (p.horizon) free = ["yaw","h"];
  else free = ["yaw","pitch"];
  const sol = solveCam(p, free);
  if (!sol) return false;
  p.cam = Object.assign(sol, { ready:true });
  return true;
}

// ================= EXIF / XMP =================
function readExif(buf){
  const out = {};
  try{
    const v = new DataView(buf); if (v.getUint16(0) !== 0xFFD8) return out;
    let o = 2;
    while (o < v.byteLength-10){
      const m = v.getUint16(o), len = v.getUint16(o+2);
      if ((m & 0xFF00) !== 0xFF00) break;
      if (m === 0xFFE1 && v.getUint32(o+4) === 0x45786966){
        const t = o+10, le = v.getUint16(t) === 0x4949;
        const g16 = q=>v.getUint16(q,le), g32 = q=>v.getUint32(q,le);
        const ifd = off => { const n = g16(t+off), tags = {}; for (let i=0;i<n;i++){ const e = t+off+2+i*12; tags[g16(e)] = { type:g16(e+2), count:g32(e+4), at:e+8 }; } return tags; };
        const rat = (at, i) => { const p = t + g32(at) + i*8; const d = g32(p+4); return d ? g32(p)/d : 0; };
        const i0 = ifd(g32(t+4));
        if (i0[0x8769]){ const ex = ifd(g32(i0[0x8769].at)); if (ex[0xA405]) out.f35 = g16(ex[0xA405].at) || undefined; }
        if (i0[0x8825]){
          const gp = ifd(g32(i0[0x8825].at));
          const ch = tag => gp[tag] ? String.fromCharCode(v.getUint8(gp[tag].at)) : "";
          const dms = tag => gp[tag] ? rat(gp[tag].at,0) + rat(gp[tag].at,1)/60 + rat(gp[tag].at,2)/3600 : null;
          const lat = dms(2), lng = dms(4);
          if (lat != null && lng != null && (lat || lng)){ out.lat = ch(1)==="S" ? -lat : lat; out.lng = ch(3)==="W" ? -lng : lng; }
          if (gp[6]){ out.alt = rat(gp[6].at,0) * (gp[5] && v.getUint8(gp[5].at)===1 ? -1 : 1); }
        }
        break;
      }
      o += 2 + len;
    }
  }catch(e){}
  return out;
}
async function readDroneMeta(file){
  try{
    const buf = await file.slice(0, 2*1024*1024).arrayBuffer();
    const ex = readExif(buf);
    const txt = new TextDecoder("latin1").decode(buf);
    const g = k => { const m = txt.match(new RegExp("drone-dji:"+k+"\\s*(?:=\\s*\"|>)\\s*([+-]?[\\d.]+)")); return m ? parseFloat(m[1]) : null; };
    const zm = txt.match(/baker:Zoom\s*=\s*"([\d.]+)"/), meta = { f35: (ex.f35 || 24) * (zm ? parseFloat(zm[1]) : 1) };   // levelled photos are zoomed in slightly
    const lat = g("GpsLatitude") ?? ex.lat, lng = g("GpsLongitude") ?? g("GpsLongtitude") ?? ex.lng;
    if (lat == null || lng == null) return null;
    meta.lat = lat; meta.lng = lng; meta.alt = ex.alt;
    // DJI Fly drones (Mini 4 Pro) write GimbalYawDegree ~14° off true heading; the airframe heading (FlightYawDegree)
    // lined up with the streets on every test photo, so use it when the two roughly agree (gimbal in follow mode).
    const gy = g("GimbalYawDegree"), fy = g("FlightYawDegree"), pitch = g("GimbalPitchDegree"), h = g("RelativeAltitude");
    const dyaw = (gy!=null && fy!=null) ? Math.abs(((gy - fy) % 360 + 540) % 360 - 180) : 999;
    // Mavic 3 Pro: gimbal and airframe each read a couple of degrees out, in opposite directions — the mean landed
    // within 0.3° of the Perth CBD skyline 15 km away (Kingsley, Oct 2026), so average them when they're close.
    const mid = gy + ((((fy - gy) % 360) + 540) % 360 - 180)/2;
    const yaw = dyaw < 6 ? mid : fy;   // Mini 4 Pro (DJI Fly) gimbal yaw can be 14°–150° out; the airframe heading is right
    if ([h,yaw,pitch].every(x=>x!=null && !isNaN(x)) && h > 2) meta.gimbal = { h, yaw, pitch, roll: g("GimbalRollDegree") || 0 };
    return meta;
  }catch(e){ return null; }
}
function makeCam(meta){
  if (!meta) return null;
  if (meta.gimbal) return { lat:meta.lat, lng:meta.lng, f35:meta.f35, h:meta.gimbal.h, yaw:meta.gimbal.yaw, pitch:meta.gimbal.pitch, roll:meta.gimbal.roll, fromGimbal:true, ready:true };
  // Edited exports keep GPS but lose heading/tilt. GPS altitude is above sea level and often off,
  // so it's only a starting guess; the horizon and the house click settle the rest.
  const h0 = meta.alt ? Math.max(30, Math.min(150, meta.alt + 20)) : 100;
  return { lat:meta.lat, lng:meta.lng, f35:meta.f35, h:h0, h0, yaw:0, pitch:-20, roll:0, fromGimbal:false, ready:false };
}

// ================= Baker finish (learned from our delivered aerials) =================
let LUT = null;
function lut(){ if (LUT) return LUT; const bin = atob(LUT_B64); LUT = new Int8Array(bin.length); for (let i=0;i<bin.length;i++){ const c = bin.charCodeAt(i); LUT[i] = c>127 ? c-256 : c; } return LUT; }
function boxesForGauss(sigma, n){ const wIdeal = Math.sqrt((12*sigma*sigma/n)+1); let wl = Math.floor(wIdeal); if (wl%2===0) wl--; const wu = wl+2; const mIdeal = (12*sigma*sigma - n*wl*wl - 4*n*wl - 3*n)/(-4*wl - 4); const m = Math.round(mIdeal); const out=[]; for (let i=0;i<n;i++) out.push(i<m?wl:wu); return out; }
function boxH(src, dst, w, h, r){ const iarr = 1/(r+r+1); for (let i=0;i<h;i++){ let ti=i*w, li=ti, ri=ti+r; const fv=src[ti], lv=src[ti+w-1]; let val=(r+1)*fv; for (let j=0;j<r;j++) val+=src[ti+Math.min(j,w-1)]; for (let j=0;j<=r;j++){ val+=src[Math.min(ri++, ti+w-1)]-fv; dst[ti++]=val*iarr; } for (let j=r+1;j<w-r;j++){ val+=src[ri++]-src[li++]; dst[ti++]=val*iarr; } for (let j=w-r;j<w;j++){ val+=lv-src[li++]; dst[ti++]=val*iarr; } } }
function boxV(src, dst, w, h, r){ const iarr = 1/(r+r+1); for (let i=0;i<w;i++){ let ti=i, li=ti, ri=ti+r*w; const fv=src[ti], lv=src[ti+w*(h-1)]; let val=(r+1)*fv; for (let j=0;j<r;j++) val+=src[ti+Math.min(j,h-1)*w]; for (let j=0;j<=r;j++){ val+=src[Math.min(ri, ti+w*(h-1))]-fv; dst[ti]=val*iarr; ri+=w; ti+=w; } for (let j=r+1;j<h-r;j++){ val+=src[ri]-src[li]; dst[ti]=val*iarr; li+=w; ri+=w; ti+=w; } for (let j=h-r;j<h;j++){ val+=lv-src[li]; dst[ti]=val*iarr; li+=w; ti+=w; } } }
function gaussBlur(src, w, h, sigma){
  const a = Float32Array.from(src), b = new Float32Array(src.length);
  for (const bx of boxesForGauss(sigma, 3)){ const r = (bx-1)/2; if (r<1) continue; boxH(a, b, w, h, r); boxV(b, a, w, h, r); }
  return a;
}
const SKY_STOPS = [[112,160,216],[134,176,224],[150,187,229],[170,199,232],[189,209,233],[203,215,231]];  // soft natural pale blue, a touch bluer than the old set (Jason, Sep 2026)
// Finds the horizon (sky is smooth and blue/white, land is textured) and fits a straight line.
function analyseSky(img, w, h){
  const s = Math.max(1, Math.round(w/600)), sw = Math.floor(w/s), sh = Math.floor(h/s);
  const R = new Float32Array(sw*sh), G = new Float32Array(sw*sh), B = new Float32Array(sw*sh), Y = new Float32Array(sw*sh);
  for (let y=0;y<sh;y++) for (let x=0;x<sw;x++){ const i=((y*s)*w + x*s)*4, j=y*sw+x; R[j]=img[i]; G[j]=img[i+1]; B[j]=img[i+2]; Y[j]=(img[i]+img[i+1]+img[i+2])/3; }
  const bl = gaussBlur(Y, sw, sh, 1.5); const d = new Float32Array(sw*sh); for (let i=0;i<d.length;i++) d[i] = Math.abs(Y[i]-bl[i]);
  const tex = gaussBlur(d, sw, sh, 2);
  // brightness of the real sky at the top of the frame: distant blue hills are sky-coloured but clearly darker
  const tops=[]; for (let y=0;y<Math.max(2,sh*0.06|0);y++) for (let x=0;x<sw;x++){ const i=y*sw+x; if (B[i]>R[i]+6 && B[i]>110) tops.push(Y[i]); }
  tops.sort((a,b)=>a-b); const topY = tops.length > sw ? tops[tops.length>>1] : 0;
  const skyc = new Uint8Array(sw*sh), ok = new Uint8Array(sw*sh);
  for (let i=0;i<d.length;i++){ const mn=Math.min(R[i],G[i],B[i]), mx=Math.max(R[i],G[i],B[i]); skyc[i] = ((B[i]>R[i]+6 && B[i]>110 && Y[i] > topY*0.8) || (mn>165 && mx-mn<55)) ? 1 : 0; ok[i] = skyc[i] && tex[i]<2.2 ? 1 : 0; }
  // Horizon: first band (scanning down) where most pixels are not sky-coloured, in 8 vertical strips, then a robust line.
  // Clouds are sky-coloured, so they don't stop the scan the way a texture test would.
  const strips = 8, pts = [];
  for (let k=0;k<strips;k++){
    const xa = Math.floor(k*sw/strips), xb = Math.floor((k+1)*sw/strips), f = new Float32Array(sh);
    for (let y=0;y<sh;y++){ let n=0; for (let x=xa;x<xb;x++) n += skyc[y*sw+x] ? 0 : 1; f[y] = n/(xb-xa); }
    for (let y=0;y<sh-6;y++){ let mn=1; for (let t=0;t<6;t++) mn=Math.min(mn,f[y+t]); if (mn>0.5){ pts.push([(xa+xb)/2, y]); break; } }
  }
  if (pts.length < 3) return null;
  const ys = pts.map(q=>q[1]).sort((a,b)=>a-b), med = ys[ys.length>>1];
  if (med < sh*0.03) return null;                                   // straight-down shot: no sky
  const gp = pts.filter(q=>Math.abs(q[1]-med) < sh*0.05);
  let n=gp.length, sx=0, sy=0, sxx=0, sxy=0; gp.forEach(([x,y])=>{ sx+=x; sy+=y; sxx+=x*x; sxy+=x*y; });
  let m = n>1 ? (n*sxy-sx*sy)/((n*sxx-sx*sx)||1) : 0, b = (sy-m*sx)/n;
  if (Math.abs(m) > 0.06){ m = 0; b = med; }                          // implausible tilt: treat as level
  // horizon in working px: y = m*x + b*s  (slope unchanged by subsampling)
  const cloud = new Uint8Array(sw*sh); for (let i=0;i<d.length;i++){ const mn=Math.min(R[i],G[i],B[i]), mx=Math.max(R[i],G[i],B[i]); cloud[i] = (skyc[i] || (mn>105 && mx-mn<45 && B[i]>=R[i]-4 && Y[i] > topY*0.8)) ? 1 : 0; }
  return { m, b:b*s, s, sw, sh, skyc, tex, cloud };
}
const LOOK0 = { y:114, rg:1.075, bg:0.876, sat:0.29, lo:24, hi:210 }, LOOK = LOOK0;
const TUNE = Object.assign({ fine:1.3, mid:1.0, sat:0.30, lutMix:0.2, relSat:0.03,   // 26 Oct: natural texture (was fine 2.3 / mid 1.35 / full LUT = crunchy)
  noDehaze:false, skyTop:[140,180,222], skyHz:[188,201,212], plateMix:0.95, realMix:0.9, farSoft:0, hzStart:0.5, hzAmt:0.9, lookY:108, lookLo:14, lookHi:210, lookBg:0.91, lookRg:1.075, lvlAmt:0.65 }, (typeof window!=='undefined' && window.__TUNE) || {});
function lookStats(px, w, h){
  const st = Math.max(1, Math.round(Math.sqrt(w*h/120000))), ys=[]; let R=0,G=0,B=0,S=0,n=0;
  for (let y=Math.floor(h*.45); y<h; y+=st) for (let x=0; x<w; x+=st){ const i=(y*w+x)*4, r=px[i], g=px[i+1], b=px[i+2], Y=.299*r+.587*g+.114*b; ys.push(Y); if (Y>30 && Y<225){ R+=r; G+=g; B+=b; const mx=Math.max(r,g,b), mn=Math.min(r,g,b); S+=(mx-mn)/(mx+1e-3); n++; } }
  ys.sort((a,b)=>a-b); const q = f => ys[Math.min(ys.length-1, Math.floor(f*ys.length))];
  return { med:q(.5), lo:q(.05), hi:q(.95), rg:R/Math.max(G,1), bg:B/Math.max(G,1), sat:S/Math.max(n,1) };
}
function normaliseLook(px, w, h){
  const s = lookStats(px, w, h), cl = (v,a,b)=>Math.max(a,Math.min(b,v)), TT = Object.assign({}, TUNE, window.__TUNE||{}), LOOK = Object.assign({}, LOOK0, { y:TT.lookY, lo:TT.lookLo, hi:TT.lookHi, bg:TT.lookBg, rg:TT.lookRg });
  // Editors keep each photo's own exposure and cast, then lift it a touch, warm it and add saturation.
  const RS = window.__rawSt, rel = !(window.__TUNE && window.__TUNE.lookY) && TT.relative !== false && RS;
  if (rel){ LOOK.y = cl(RS.med + (TT.relY||10), 100, 158); LOOK.rg = cl(RS.rg + (TT.relRg||0.03), 0.98, 1.24); LOOK.bg = cl(RS.bg - (TT.relBg||0.04), 0.72, 1.0); }
  const satT = rel ? cl(RS.sat + (TT.relSat||0.07), 0.2, 0.42) : (window.__TUNE&&window.__TUNE.sat||TUNE.sat);
  const kr = cl(Math.pow(LOOK.rg/s.rg, .7), .9, 1.1), kb = cl(Math.pow(LOOK.bg/s.bg, .7), .9, 1.1);
  const gam = cl(Math.log(LOOK.y/255)/Math.log(Math.max(5,s.med)/255), .7, 1.6), gm = 1 + (gam-1)*.9;
  const ks = cl(Math.pow(satT/Math.max(.05,s.sat), .5), TT.ksMin||.88, 1.25);
  // levels after gamma: nudge the 5th/95th percentiles halfway to the finals'
  const g = v => 255*Math.pow(v/255, gm), lo = g(s.lo), hi = g(s.hi);
  const lo2 = lo + (LOOK.lo-lo)*TT.lvlAmt, hi2 = hi + (LOOK.hi-hi)*TT.lvlAmt, a = (hi2-lo2)/Math.max(20,hi-lo), b0 = lo2 - a*lo;
  const T = new Float32Array(256), SK = TT.curve||0; for (let v=0; v<256; v++){ let o = cl(a*g(v)+b0, 0, 255); if (SK){ const S = 127.5-127.5*Math.cos(Math.PI*o/255); o = o + SK*(S-o); } T[v] = o; }
  for (let i=0;i<px.length;i+=4){
    const r = T[cl(px[i]*kr,0,255)|0], gg = T[px[i+1]], b = T[cl(px[i+2]*kb,0,255)|0];
    const Y = .299*r+.587*gg+.114*b;
    px[i] = cl(Y+(r-Y)*ks,0,255); px[i+1] = cl(Y+(gg-Y)*ks,0,255); px[i+2] = cl(Y+(b-Y)*ks,0,255);
  }
}
// Dark-channel dehaze, limited to a band below the horizon and fading out toward the foreground.
function dehazeBand(px, w, h, line){
  const s = Math.max(1, Math.round(w/500)), sw = Math.floor(w/s), sh = Math.floor(h/s);
  const hz0 = Math.max(0, Math.min(line(0), line(w))), band = 0.42*h;
  if (hz0 > h*0.8) return;
  // low-res dark channel
  const D = new Float32Array(sw*sh);
  for (let y=0;y<sh;y++) for (let x=0;x<sw;x++){ const i=((y*s)*w+x*s)*4; D[y*sw+x] = Math.min(px[i],px[i+1],px[i+2]); }
  const r = 5, M = new Float32Array(sw*sh), T = new Float32Array(sw*sh);
  for (let y=0;y<sh;y++) for (let x=0;x<sw;x++){ let m=255; for (let k=-r;k<=r;k++){ const xx=Math.min(sw-1,Math.max(0,x+k)); const v=D[y*sw+xx]; if (v<m) m=v; } T[y*sw+x]=m; }
  for (let y=0;y<sh;y++) for (let x=0;x<sw;x++){ let m=255; for (let k=-r;k<=r;k++){ const yy=Math.min(sh-1,Math.max(0,y+k)); const v=T[yy*sw+x]; if (v<m) m=v; } M[y*sw+x]=m; }
  const Mb = gaussBlur(M, sw, sh, 8);
  // water / smooth sky under the line: flat and bluish — dehazing it blows it out, so leave it alone
  const Lr = new Float32Array(sw*sh), Wm = new Float32Array(sw*sh);
  for (let y=0;y<sh;y++) for (let x=0;x<sw;x++){ const i=((y*s)*w+x*s)*4; Lr[y*sw+x]=(px[i]+px[i+1]+px[i+2])/3; }
  const Lb = gaussBlur(Lr, sw, sh, 1.2); const Td = new Float32Array(sw*sh); for (let i=0;i<Td.length;i++) Td[i]=Math.abs(Lr[i]-Lb[i]);
  const Tx = gaussBlur(Td, sw, sh, 2.5);
  for (let y=0;y<sh;y++) for (let x=0;x<sw;x++){ const j=y*sw+x, i=((y*s)*w+x*s)*4; const bl = px[i+2]-px[i]; Wm[j] = (Tx[j] < 4 && bl > 4) ? 1 : (Tx[j] < 2.2 ? 0.7 : 0); }
  const Wb = gaussBlur(Wm, sw, sh, 12);
  const wat = (x,y) => { const fx=Math.min(sw-1,x/s|0), fy=Math.min(sh-1,y/s|0); return Math.min(1, Wb[fy*sw+fx]*1.4); };
  // airlight: brightest ground haze in the first slice under the horizon
  let ar=0, ag=0, ab=0, n=0; const vals=[];
  for (let y=0;y<sh;y++) for (let x=0;x<sw;x++){ const Y=y*s, X=x*s, hz=line(X); if (Y<hz+2 || Y>hz+0.06*h) continue; vals.push(Mb[y*sw+x]); }
  if (vals.length < 20) return; vals.sort((a,b)=>a-b); const thr = vals[Math.floor(vals.length*0.9)];
  for (let y=0;y<sh;y++) for (let x=0;x<sw;x++){ const Y=y*s, X=x*s, hz=line(X); if (Y<hz+2 || Y>hz+0.06*h || Mb[y*sw+x]<thr) continue; const i=(Y*w+X)*4; ar+=px[i]; ag+=px[i+1]; ab+=px[i+2]; n++; }
  if (!n) return; ar/=n; ag/=n; ab/=n; const A = Math.max(ar,ag,ab);
  if (thr < 95) return;   // no real haze — leave it alone
  const at = (x,y) => { const fx=Math.min(sw-1.001,x/s), fy=Math.min(sh-1.001,y/s), x0=fx|0, y0=fy|0, tx=fx-x0, ty=fy-y0, i=y0*sw+x0; return (Mb[i]*(1-tx)+Mb[i+1]*tx)*(1-ty)+(Mb[i+sw]*(1-tx)+Mb[i+sw+1]*tx)*ty; };
  const strength = Math.min(0.6, Math.max(0.35, (thr-95)/100 + 0.35));
  for (let y=Math.max(0, (hz0 - 0.5*band)|0); y<h; y++){
    for (let x=0;x<w;x++){
      const hz = line(x), d = (y-hz)/band; if (d < -0.5 || d > 1) continue;   // 26 Oct: fade over 0.5 band above the line (was 0.02 = seam through hills)
      const u = d < 0 ? 1 + d/0.5 : 1 - d; const wgt = u*u*(3-2*u);
      const tmin = 0.55 + 0.25*Math.min(1, Math.max(0,d)/0.5), st2 = Math.min(0.7, strength + 0.1*(1-Math.min(1,Math.max(0,d)/0.3)));
      const t = Math.max(tmin, 1 - st2*wgt*(1-wat(x,y))*at(x,y)/A);
      const i = (y*w+x)*4;
      px[i]   = (px[i]  -ar)/t + ar - (1-t)*12;
      px[i+1] = (px[i+1]-ag)/t + ag - (1-t)*10;
      px[i+2] = (px[i+2]-ab)/t + ab - (1-t)*14;
    }
  }
}
function finishImage(base, p){
  { const pk = (typeof prefs!=="undefined" && prefs.skyPlate) || "C"; if (typeof SKYP_CACHE!=="undefined" && SKYP_CACHE[pk]) SKYP = SKYP_CACHE[pk]; }
  const w = base.width, h = base.height;
  const ctx = base.getContext("2d"); const id = ctx.getImageData(0,0,w,h); const px = id.data;
  window.__rawSt = lookStats(px, w, h);
  const L = lut(), N = LUT_N, N2 = N*N, sc = (N-1)/255, LM = (Object.assign({},TUNE,window.__TUNE||{})).lutMix ?? 1;
  // 1. colour: 3D lookup table (offsets), trilinear
  for (let i=0;i<px.length;i+=4){
    const r=px[i], g=px[i+1], b=px[i+2];
    const fr=r*sc, fg=g*sc, fb=b*sc; let ir=fr|0, ig=fg|0, ib=fb|0; if (ir>N-2) ir=N-2; if (ig>N-2) ig=N-2; if (ib>N-2) ib=N-2;
    const tr=fr-ir, tg=fg-ig, tb=fb-ib;
    const o000=(ir*N2+ig*N+ib)*3, o100=o000+N2*3, o010=o000+N*3, o001=o000+3, o110=o100+N*3, o101=o100+3, o011=o010+3, o111=o110+3;
    for (let c=0;c<3;c++){
      const v = (((L[o000+c]*(1-tb)+L[o001+c]*tb)*(1-tg) + (L[o010+c]*(1-tb)+L[o011+c]*tb)*tg)*(1-tr) + ((L[o100+c]*(1-tb)+L[o101+c]*tb)*(1-tg) + (L[o110+c]*(1-tb)+L[o111+c]*tb)*tg)*tr);
      px[i+c] = px[i+c] + v*LM;
    }
  }
  // 1b. consistency: pull every photo to the same place — the median of 191 delivered finals (ground exposure, white balance, saturation, black/white points)
  normaliseLook(px, w, h);
  // 2. sky analysis on the graded image
  const straightDown = p.cam && typeof p.cam.pitch === 'number' && p.cam.pitch < -65;   // top-downs never have sky
  let sky = (p.skyOn !== false && !straightDown && !(window.__TUNE&&window.__TUNE.noSky)) ? analyseSky(px, w, h) : null;
  // Sky can't sit below the true horizon: a washed-out sea or haze is not sky. Clamp to the camera's geometric horizon.
  if (sky && p.cam && p.cam.ready && p.cam.pitch > -60){
    // 26 Oct: use the drone's recorded gimbal tilt here, not the map-registered camera (that one is tuned to put pins right and can be
    // a few degrees off as a horizon — the portal loads it before finishing, which clamped the sky ~130 px too high and left a grey band)
    const gP = (p.meta && p.meta.gimbal && isFinite(p.meta.gimbal.pitch)) ? p.meta.gimbal.pitch : p.cam.pitch, gF = (p.meta && p.meta.f35) || p.cam.f35;
    const fpx = gF*Math.hypot(p.ow,p.oh)/43.27, yO = p.oh/2 + fpx*Math.tan((gP+0.35)*DEG), geo = (yO - p.y0)*p.k + 0.004*h;
    const xc = w/2, ydet = sky.m*xc + sky.b;
    window.__skyDbg=(window.__skyDbg||[]);
    let bandTex = 0; { const ya=Math.max(0,(geo/sky.s)|0), yb=Math.min(sky.sh,(ydet/sky.s)|0); let t=0,n=0; for (let y=ya;y<yb;y++) for (let x=0;x<sky.sw;x+=2){ t+=sky.tex[y*sky.sw+x]; n++; } bandTex = n ? t/n : 0; }
    window.__skyDbg.push({ydet:Math.round(ydet),geo:Math.round(geo),bandTex:+bandTex.toFixed(2)});
    if (ydet > geo + 0.012*h && bandTex < (Object.assign({},TUNE,window.__TUNE||{}).clampTex||2.0)){ sky.b = geo + 0.006*h - sky.m*xc; p.skyClamped = Math.round(ydet-geo);
      // the blown band (glary sea / haze) between the true horizon and where the sky test stopped: compress highlights evenly so it reads as water
      { const yA = Math.max(0,(geo-0.02*h)|0), yB = Math.min(h,(ydet+0.03*h)|0), fe = Math.max(2, 0.015*h);
        for (let y=yA; y<yB; y++){ const v = Math.min(1,(y-yA)/fe, (yB-y)/fe); for (let x=0;x<w;x++){ const i=(y*w+x)*4, Y=(px[i]+px[i+1]+px[i+2])/3; const t = Math.min(1, Math.max(0,(Y-170)/70))*v; if (t<=0) continue;
          const k = 1 - 0.3*t; px[i]*=k*(1-0.03*t); px[i+1]*=k; px[i+2]*=k*(1+0.02*t); } } }
    }
  }
  // 2b. dehaze: distant ground just under the horizon goes milky grey into the sun — pull it back
  if (sky && p.dehaze !== false && !(Object.assign({},TUNE,window.__TUNE||{}).noDehaze)) dehazeBand(px, w, h, x => sky.m*x + sky.b);
  // Golden-hour / dawn sky: warm, not blue. Editors leave these alone — so do we.
  if (sky){ let r=0,b=0,n=0; const hz = Math.max(4, Math.min(h-1, sky.b|0)), st = Math.max(1, Math.round(w/300));
    let g=0; for (let y=0; y<hz*0.8; y+=st) for (let x=0; x<w; x+=st){ const i=(y*w+x)*4; r+=px[i]; g+=px[i+1]; b+=px[i+2]; n++; }
    if (n && (r - b)/n > 6 && (r+g+b)/(3*n) < 236) { p.skyWarm = true; sky = null; } }
  // Keep a good real sky (blue with proper clouds): the editors only swap washed-out or blown skies.
  p.skyKept = false;
  if (sky && p.skyKeepReal === true){
    let n=0, blue=0, clip=0, cloudp=0; const hz = Math.max(4, Math.min(h-1, sky.b|0)), st = Math.max(1, Math.round(w/400));
    for (let y=0; y<hz*0.85; y+=st) for (let x=0; x<w; x+=st){ const i=(y*w+x)*4, r=px[i], g=px[i+1], b=px[i+2]; n++; if (b > r + 28 && b > 120) blue++; else if (Math.min(r,g,b) > 165 && b >= r - 4 && !(r>242 && g>242 && b>242)) cloudp++; if (r>242 && g>242 && b>242) clip++; }
    if (n && ((blue/n > 0.45 && clip/n < 0.12) || (blue/n > 0.2 && (blue+cloudp)/n > 0.85 && clip/n < 0.06))){ p.skyKept = true; }
  }
  let prot = null, line = null;
  if (sky){
    line = x => sky.m*x + sky.b;
    // low-res protection mask (sky-coloured and smooth), blurred, sampled bilinearly later
    const m = new Float32Array(sky.sw*sky.sh); for (let i=0;i<m.length;i++) m[i] = (sky.skyc[i] && sky.tex[i]<3.0) || (sky.cloud[i] && sky.tex[i]<4.5) ? 1 : 0;
    prot = gaussBlur(m, sky.sw, sky.sh, 4);
    // per column: the sky stops at the first clearly-not-sky pixel; never replace anything below it (stops leaks onto water/haze)
    sky.colLim = new Float32Array(sky.sw);
    for (let x=0;x<sky.sw;x++){ let y=0; const hz=Math.min(sky.sh,(sky.m*x*sky.s + sky.b)/sky.s); while (y<hz && prot[y*sky.sw+x] <= 0.35) y++; if (y>=hz){ sky.colLim[x]=hz; continue; } while (y<hz && prot[y*sky.sw+x] > 0.35) y++; sky.colLim[x]=y; }
    const cl2 = new Float32Array(sky.sw); for (let x=0;x<sky.sw;x++){ const v=[]; for (let k=-6;k<=6;k++){ const xx=Math.min(sky.sw-1,Math.max(0,x+k)); v.push(sky.colLim[xx]); } v.sort((a,b)=>a-b); cl2[x]=v[3]; } sky.colLim=cl2;
    // fill narrow dips (< ~4% of width) that contain no texture: those are missed sky, not poles or towers
    { const W2=sky.sw, maxW=Math.max(6, W2*0.04|0), L=sky.colLim;
      for (let x=1; x<W2-1; x++){ if (L[x] >= L[x-1]-2) continue; let e=x; while (e<W2-1 && L[e] < L[x-1]-2) e++; if (e-x > maxW) { x=e; continue; }
        const lvl = Math.min(L[x-1], L[Math.min(W2-1,e)]); let tx=0, n=0;
        for (let xx=x; xx<e; xx++) for (let yy=L[xx]|0; yy<lvl; yy++){ tx += sky.tex[yy*W2+xx]; n++; }
        if (!n || tx/n < 3.0) for (let xx=x; xx<e; xx++) L[xx]=lvl; x=e; } }
  }
  const protAt = (x,y) => { if (!prot) return 0; const fx = Math.min(sky.sw-1.001, x/sky.s), fy = Math.min(sky.sh-1.001, y/sky.s); const x0=fx|0, y0=fy|0, tx=fx-x0, ty=fy-y0, i=y0*sky.sw+x0; return (prot[i]*(1-tx)+prot[i+1]*tx)*(1-ty) + (prot[i+sky.sw]*(1-tx)+prot[i+sky.sw+1]*tx)*ty; };
  // 3. detail: band gains fitted to the finals (crisp fine detail, slightly flatter large-scale contrast)
  const Y = new Float32Array(w*h); for (let i=0,j=0;j<Y.length;i+=4,j++) Y[j]=(px[i]+px[i+1]+px[i+2])/3;
  const scale = w/3000;
  const g1 = gaussBlur(Y,w,h,1*scale+0.0001), g3 = gaussBlur(g1,w,h,Math.sqrt(Math.max(0.01,9-1))*scale), g10 = gaussBlur(g3,w,h,Math.sqrt(100-9)*scale), g30 = gaussBlur(g10,w,h,Math.sqrt(900-100)*scale);
  const G = BAND_GAINS, TT = Object.assign({}, TUNE, window.__TUNE||{}), TF = TT.fine, TM = TT.mid;
  const wSky = new Float32Array(w*h);
  if (sky){ for (let y=0;y<h;y++){ for (let x=0;x<w;x++){ const hz = line(x); if (y >= hz) continue; const t = y/Math.max(hz,1); const ii=(y*w+x)*4, mx=Math.max(px[ii],px[ii+1],px[ii+2]), mn=Math.min(px[ii],px[ii+1],px[ii+2]), haze = mn > 185 && mx-mn < 40; const u = Math.min(1, Math.max(0,(1-t)/(haze ? 0.035 : 0.14))); const fade = u*u*(3-2*u); const pr = protAt(x,y); const lim = sky.colLim[Math.min(sky.sw-1,(x/sky.s)|0)]*sky.s, dl = (lim - y)/(h*0.012); const cf = (y > hz - 0.08*h && y < hz - 0.003*h) ? 1 : (dl<=0 ? 0 : Math.min(1, dl)); wSky[y*w+x] = fade * Math.min(1, Math.sqrt(pr)*1.4) * cf; } } }
  const det20 = sky ? gaussBlur(Y,w,h,20*scale) : null;
  // land guard: just above the horizon, anything clearly darker than the sky a little higher up is land (hills, city towers), not sky — keep it
  let Tm = null; if (sky){ const d = new Float32Array(w*h); for (let k=0;k<d.length;k++) d[k] = Math.abs(Y[k]-g3[k]); Tm = gaussBlur(d, w, h, 5*scale+0.5); }
  let landTop = null, landTrend = null, landEnv = null, rowTone = null, landLoc = null;
  let refY = null;
  if (sky){ refY = new Float32Array(w); const st=Math.max(1,(w/400)|0), tmp=new Float32Array(Math.ceil(w/st));
    for (let xs=0,k=0; xs<w; xs+=st,k++){ const hz=line(xs), ya=Math.max(0,(hz-0.16*h)|0), yb=Math.max(ya+1,(hz-0.08*h)|0), v=[];
      for (let y=ya;y<yb;y+=Math.max(1,((yb-ya)/24)|0)){ const j=y*w+xs; if (SKYP && SKYP.direct ? true : wSky[j]>0.3) v.push(Y[j]); }
      v.sort((a,b)=>a-b); tmp[k] = v.length>3 ? v[(v.length*0.35)|0] : 255; }
    const n=tmp.length, R=Math.max(2,(n*0.04)|0);
    for (let k=0;k<n;k++){ let a=0,c=0; for (let t=-R;t<=R;t++){ const kk=Math.min(n-1,Math.max(0,k+t)); a+=tmp[kk]; c++; } const v=a/c; for (let x=k*st; x<Math.min(w,(k+1)*st); x++) refY[x]=v; } }
  if (sky && SKYP && SKYP.direct){
    const d2 = new Float32Array(w*h); for (let k=0;k<d2.length;k++) d2[k] = Math.abs(Y[k]-g3[k]); const T2 = gaussBlur(d2, w, h, 1.5*scale+0.3);
    const Yb = g1, maxUp = 0.05*h, gapMax = 2; landTop = new Float32Array(w);
    for (let x=0;x<w;x++){ const hz=line(x); let top=hz, gap=0;
      for (let y=Math.floor(hz-0.0015*h); y>Math.max(0,hz-maxUp); y--){ const j=y*w+x; const up = hz - y, land = (up < 0.004*h && Yb[j] < refY[x]-12) || (Yb[j] < refY[x]-45) || (T2[j] > 2.6 && Yb[j] < refY[x]-6);
        if (land){ top=y; gap=0; } else if (++gap > gapMax) break; }
      if (top >= hz - 0.0015*h - 1){ let y = Math.max(0, Math.floor(hz)); const yMax = Math.min(h-2, hz + 0.03*h);
        while (y < yMax){ const j=y*w+x; if (T2[j] >= 1.8 || Yb[j] < refY[x] - 15) break; y++; } if (y > hz + 2) top = y; }
      landTop[x]=top; }
    { const R = Math.max(5, Math.round(0.01*w)), lt2 = new Float32Array(w), buf=[];
      for (let x=0;x<w;x++){ buf.length=0; for (let k=-R;k<=R;k+=2) buf.push(landTop[Math.min(w-1,Math.max(0,x+k))]); buf.sort((a,b)=>a-b); lt2[x]=buf[buf.length>>1]; }
      const lt3 = new Float32Array(w); for (let x=0;x<w;x++){ let a=0,n=0; for (let k=-12;k<=12;k+=2){ a+=lt2[Math.min(w-1,Math.max(0,x+k))]; n++; } lt3[x]=a/n; }
      // cap soft bulges: the edge may rise at most ~12px above its broad trend unless the bulge is crisp detail (towers)
      const W2 = Math.round(0.06*w), pre = new Float64Array(w+1); for (let x=0;x<w;x++) pre[x+1]=pre[x]+lt3[x];
      for (let x=0;x<w;x++){ const a0=Math.max(0,x-W2), a1=Math.min(w,x+W2+1), trend=(pre[a1]-pre[a0])/(a1-a0), cap = trend - 0.006*h;
        void cap; }
      landTrend = new Float32Array(w); for (let x=0;x<w;x++){ const a0=Math.max(0,x-W2), a1=Math.min(w,x+W2+1); landTrend[x]=Math.max(lt3[x], (pre[a1]-pre[a0])/(a1-a0)); }
      window.__ltDbg = (window.__ltDbg||[]).concat([{h, hz:[0,500,1000,1500,2000,2500].map(x=>Math.round(line(x*w/3000))), lt:[0,500,1000,1500,2000,2500].map(x=>Math.round(lt3[Math.round(x*w/3000)])), refY:[0,1500].map(x=>Math.round(refY[Math.round(x*w/3000)]))}]);
      landTop = lt3;
      // envelope: the highest land nearby, smoothed - the new sky never comes below this, so nothing near the horizon is ever cut out
      { const Rw = Math.round(0.04*w), env = new Float32Array(w);
        for (let x=0;x<w;x++){ let m=1e9; for (let k=-Rw;k<=Rw;k+=3){ const v=lt3[Math.min(w-1,Math.max(0,x+k))]; if (v<m) m=v; } env[x]=m; }
        const Rs = Math.round(0.02*w), pe = new Float64Array(w+1); for (let x=0;x<w;x++) pe[x+1]=pe[x]+env[x];
        landEnv = new Float32Array(w); for (let x=0;x<w;x++){ const a0=Math.max(0,x-Rs), a1=Math.min(w,x+Rs+1); landEnv[x]=Math.min(env[x], (pe[a1]-pe[a0])/(a1-a0)); }
        // smooth fade line (26 Oct): the envelope has hard steps beside tall features, which showed as grey boxes of old sky.
        // Two box passes (triangle, ~5% of width) turn every step into a gentle ramp; the plateau over a hill stays put.
        { const Rb = Math.max(4, Math.round(0.025*w)); let src = landEnv;
          for (let pass=0; pass<2; pass++){ const p2 = new Float64Array(w+1); for (let x=0;x<w;x++) p2[x+1]=p2[x]+src[x];
            const o = new Float32Array(w); for (let x=0;x<w;x++){ const a0=Math.max(0,x-Rb), a1=Math.min(w,x+Rb+1); o[x]=(p2[a1]-p2[a0])/(a1-a0); } src = o; }
          landLoc = src; }
        // per-row mean of the original sky between the envelope fade and the land, for tone matching
        rowTone = new Float32Array(h*3).fill(-1);
        for (let y=0;y<h;y++){ let a=0,b2=0,c=0,n=0; for (let x=0;x<w;x+=4){ if (y > landEnv[x] - 0.05*h && y < landEnv[x] + 0.035*h && Y[y*w+x] > refY[x] - 30){ const i=(y*w+x)*4; a+=px[i]; b2+=px[i+1]; c+=px[i+2]; n++; } } if (n>20){ rowTone[y*3]=a/n; rowTone[y*3+1]=b2/n; rowTone[y*3+2]=c/n; } }
      } } }
  let realRM = null;
  if (sky && p.skyKept){
    realRM = []; let last=[TT.skyTop[0],TT.skyTop[1],TT.skyTop[2]];
    for (let y=0;y<h;y++){ let a=0,b=0,c=0,n=0; for (let x=0;x<w;x+=3){ const j=y*w+x; if (wSky[j]>0.6){ const i=j*4; a+=px[i]; b+=px[i+1]; c+=px[i+2]; n++; } } if (n>20) last=[a/n,b/n,c/n]; realRM.push(last); }
    for (let it=0; it<3; it++){ const R=realRM.map((v,i)=>{ const lo=Math.max(0,i-40), hi=Math.min(h-1,i+40); let a=0,b=0,c=0,n=0; for (let k=lo;k<=hi;k++){ a+=realRM[k][0]; b+=realRM[k][1]; c+=realRM[k][2]; n++; } return [a/n,b/n,c/n]; }); realRM=R; }
  }
  for (let y=0;y<h;y++){
    const hz = sky ? line(0) : 0;
    for (let x=0;x<w;x++){
      const j = y*w+x, i = j*4, ws = wSky[j];
      const aw = line ? Math.min(1, Math.max(0, (line(x) - 2 - y)/(0.05*h))) : 0;   // 26 Oct: blend sky/land detail over 5% of height (was a hard switch at the line)
      const add = (aw*(G[0]*TF*(Y[j]-g1[j]) + G[1]*(g1[j]-g3[j])) + (1-aw)*(G[0]*TF*(Y[j]-g1[j]) + G[1]*TM*(g1[j]-g3[j]) + G[2]*(g3[j]-g10[j]) + G[3]*(g10[j]-g30[j]))) * (1-ws);
      let fw = 0; if (line){ const dy = (y - line(x))/(h*0.12); if (dy > -0.6 && dy < 1){ if (dy >= 0) fw = (1-dy)*(1-dy); else { const u = 1 + dy/0.6; fw = u*u*(3-2*u); } } }   // 26 Oct: fade out above the line (was a hard stop = ruled seam through hills)
      const addF = add*(1 - TT.farSoft*fw);
      let r = px[i]+addF, g = px[i+1]+addF, b = px[i+2]+addF;
      if (fw > 0 && ws < 0.5){ const hk = 0.5*TT.farSoft*fw*(1-ws); r += (TT.skyHz[0]-r)*hk; g += (TT.skyHz[1]-g)*hk; b += (TT.skyHz[2]-b)*hk; }
      const abv = line && SKYP && (y < line(x) - 3 || (landTop && y < landTop[x] + 1)); let fz = 0; if (abv){ const u = Math.min(1, Math.max(0, (1 - y/Math.max(line(x),1))/0.14)); fz = u*u*(3-2*u); if (landTop && y >= line(x) - 3) fz = 1; }
      if ((ws > 0 || fz > 0) && SKYP){ const wsE = Math.max(ws, fz);
        // plate: horizon of the plate sits on the photo's horizon; clouds squashed at most 2x toward the horizon
        const hzx = line(x), sx = w/SKYP.w, PB = SKYP.direct ? 0.985 : 0.94, sy = SKYP.direct ? Math.max(0.2, hzx/(SKYP.h*PB)) : Math.max(sx/2, hzx/(SKYP.h*0.98));
        const fx = Math.min(SKYP.w-1.001, x/sx), fy = Math.max(0, Math.min(SKYP.h*PB, SKYP.h*PB - (hzx-y)/sy));
        const x0=fx|0, y0=fy|0, tx=fx-x0, ty=fy-y0, D=SKYP.d, q=(y0*SKYP.w+x0)*4, q2=q+SKYP.w*4;
        let pr = (D[q]*(1-tx)+D[q+4]*tx)*(1-ty)+(D[q2]*(1-tx)+D[q2+4]*tx)*ty, pg = (D[q+1]*(1-tx)+D[q+5]*tx)*(1-ty)+(D[q2+1]*(1-tx)+D[q2+5]*tx)*ty, pb = (D[q+2]*(1-tx)+D[q+6]*tx)*(1-ty)+(D[q2+2]*(1-tx)+D[q2+6]*tx)*ty;
        let rmS = null; if (realRM){ pr = px[i]; pg = px[i+1]; pb = px[i+2]; rmS = realRM[y]; }
        // richer blue overhead, fading out toward the horizon
        const tv = Math.min(1, Math.max(0, y/Math.max(hzx,1))), tq = tv*tv*(3-2*tv), rm = rmS || SKYP.rm[Math.min(SKYP.h-1, fy|0)];
        const gr = TT.skyTop[0]+(TT.skyHz[0]-TT.skyTop[0])*tq, gg = TT.skyTop[1]+(TT.skyHz[1]-TT.skyTop[1])*tq, gb = TT.skyTop[2]+(TT.skyHz[2]-TT.skyTop[2])*tq;
        const pm = rmS ? TT.realMix : TT.plateMix;
        let sr = gr + (pr-rm[0])*pm, sg = gg + (pg-rm[1])*pm, sb = gb + (pb-rm[2])*pm;
        if (SKYP.direct && !rmS){ if (y >= hzx - 2){ const q = SKYP.rm[SKYP.h-2]; sr=q[0]; sg=q[1]; sb=q[2]; } else { sr = pr; sg = pg; sb = pb; } }
        // last stretch above the horizon: fade the plate into a clean, smooth haze so squashed clouds don't show as smudges
        const tz = Math.max(0, (y/Math.max(hzx,1) - TT.hzStart)/(1-TT.hzStart)), hzw = (SKYP.direct && !rmS) ? 0 : tz*tz*(3-2*tz)*TT.hzAmt;
        sr += (TT.skyHz[0]-sr)*hzw; sg += (TT.skyHz[1]-sg)*hzw; sb += (TT.skyHz[2]-sb)*hzw;
        let ww = wsE;
        { const dz = (hzx - y)/h, GZ = (Object.assign({},TUNE,window.__TUNE||{}).gz||0.045);
          if (SKYP.direct && !rmS){
            // 26 Oct: two fade lengths. Bright haze is replaced over a short distance (no grey dome over the sea);
            // anything darker than the sky (hazy hills) keeps the long, gentle fade so hills are never clipped.
            const top = (landLoc ? landLoc[x] : landEnv[x]) - 0.004*h, uS = (top - y)/(0.012*h), uL = (top - y)/(0.03*h);
            const wS = uS >= 1 ? 1 : (uS <= 0 ? 0 : uS*uS*(3-2*uS)), wL = uL >= 1 ? 1 : (uL <= 0 ? 0 : uL*uL*(3-2*uL));
            const tYb = (rowTone && rowTone[y*3] >= 0) ? (rowTone[y*3]+rowTone[y*3+1]+rowTone[y*3+2])/3 : refY[x];
            const brt = Math.min(1, Math.max(0, (g1[j] - (Math.min(tYb, refY[x]) - 28))/16));
            ww = wL + (wS - wL)*brt;
            // original sky near the horizon (between the fade and the land) is toned toward the new sky instead of cut out
            if (ww < 1 && y < landEnv[x] + 0.035*h && rowTone[y*3] >= 0){ const q = SKYP.rm[SKYP.h-2], tY = (rowTone[y*3]+rowTone[y*3+1]+rowTone[y*3+2])/3, skyish = Math.min(1, Math.max(0, (g3[j] - (tY - 22))/18)),
                kt = 0.8 * skyish * Math.min(1, Math.max(0, (landEnv[x] + 0.035*h - y)/(0.015*h)));
              r += (q[0]-rowTone[y*3])*kt; g += (q[1]-rowTone[y*3+1])*kt; b += (q[2]-rowTone[y*3+2])*kt; }
          } else {
          const o0=px[i], o1=px[i+1], o2=px[i+2], Yp = .299*o0+.587*o1+.114*o2, mn = Math.min(o0,o1,o2), mx = Math.max(o0,o1,o2);
          const bl = Math.min(1, Math.max(0, (o2 - o0 - 4)/22)) * Math.min(1, Math.max(0, (Yp - 120)/40)), cw = Math.min(1, Math.max(0, (mn - 175)/30)) * Math.min(1, Math.max(0, (40 - (mx-mn))/20));
          const e = Math.abs(Y[j]-g1[j])*2.2, gz = y > hzx - 0.08*h ? Math.min(1, Math.max(0, (Y[j] - (refY[x] - 22))/12)) : 1; ww = gz * (ws > 0.04 ? Math.min(1, ws/0.04) * Math.max(bl, cw) : Math.min(1, fz) * bl * (cw > 0.5 ? 0 : 1)) * Math.min(1, Math.max(0, (14 - e)/10)); } }
        r = r*(1-ww) + sr*ww; g = g*(1-ww) + sg*ww; b = b*(1-ww) + sb*ww;
      } else if (ws > 0){
        const hzx = line(x), t = Math.min(1, (y/Math.max(hzx,1))/0.8) * (SKY_STOPS.length-1);
        const k0 = Math.min(SKY_STOPS.length-2, Math.floor(t)), f = t-k0, s0 = SKY_STOPS[k0], s1 = SKY_STOPS[k0+1];
        const dd = 0.45*(Y[j]-det20[j]);
        r = r*(1-ws) + (s0[0]*(1-f)+s1[0]*f + dd)*ws; g = g*(1-ws) + (s0[1]*(1-f)+s1[1]*f + dd)*ws; b = b*(1-ws) + (s0[2]*(1-f)+s1[2]*f + dd)*ws;
      }
      if (false && landTop && SKYP && SKYP.direct){ const HB = (Object.assign({},TUNE,window.__TUNE||{}).hazeB||0.009)*h, d = (y - landTrend[x])/HB;
        if (d > -2.2 && d < 2.2){ const hc = SKYP.rm[SKYP.h-2], al = (Object.assign({},TUNE,window.__TUNE||{}).hazeA||0.5)*Math.exp(-d*d*(d<0?0.6:1.4));
          r += (hc[0]-r)*al; g += (hc[1]-g)*al; b += (hc[2]-b)*al; } }
      px[i]=r; px[i+1]=g; px[i+2]=b;   // Uint8ClampedArray clamps
    }
  }
  // soften the sky/land join: a short vertical blend across the horizon removes hard white lines
  if (sky && line && !(SKYP && SKYP.direct) && !(Object.assign({},TUNE,window.__TUNE||{}).noJoin)){ const r = Math.max(2, Math.round((Object.assign({},TUNE,window.__TUNE||{}).joinR||0.0025)*h)), col = new Float32Array((4*r+2)*3);
    for (let x=0; x<w; x++){ const cLim = (sky.colLim && !(SKYP && SKYP.direct)) ? sky.colLim[Math.min(sky.sw-1, (x/sky.s)|0)]*sky.s : 1e9, yb = Math.round(Math.min(line(x), cLim)), y0 = Math.max(1, yb-2*r), y1 = Math.min(h-2, yb+r); if (y1<=y0) continue; const n=y1-y0+1;
      for (let k=0;k<n;k++){ const i=((y0+k)*w+x)*4; col[k*3]=px[i]; col[k*3+1]=px[i+1]; col[k*3+2]=px[i+2]; }
      for (let k=0;k<n;k++){ const y=y0+k, d=Math.abs(y-yb)/(y<yb?2*r:r), wgt=Math.max(0,1-d); if (!wgt) continue; let a=0,b=0,cc=0,s=0;
        for (let t=-r;t<=r;t++){ const kk=Math.min(n-1,Math.max(0,k+t)), g=1-Math.abs(t)/(r+1); a+=col[kk*3]*g; b+=col[kk*3+1]*g; cc+=col[kk*3+2]*g; s+=g; }
        const i=(y*w+x)*4; px[i]=px[i]*(1-wgt)+a/s*wgt; px[i+1]=px[i+1]*(1-wgt)+b/s*wgt; px[i+2]=px[i+2]*(1-wgt)+cc/s*wgt; } } }
  const out = document.createElement("canvas"); out.width = w; out.height = h; out.getContext("2d").putImageData(id,0,0);
  return { canvas: out, sky };
}
// Horizon from the un-graded working image, for tilt and roll when the photo lost its gimbal data.
function horizonFor(p){
  const c = p.base, w = c.width, h = c.height;
  const sc = Math.min(1, 900/w), tw = Math.round(w*sc), th = Math.round(h*sc);
  const t = document.createElement("canvas"); t.width=tw; t.height=th; const x = t.getContext("2d"); x.drawImage(c,0,0,tw,th);
  const sky = analyseSky(x.getImageData(0,0,tw,th).data, tw, th);
  if (!sky) return null;
  const m = sky.m, bW = sky.b/sc;              // working px
  const xcW = (p.ow/2 - p.x0)*p.k;              // original centre column in working px
  const yW = m*xcW + bW, yO = yW/p.k + p.y0;
  const fpx = (p.cam ? p.cam.f35 : 24)*Math.hypot(p.ow,p.oh)/43.27;
  const pitch = -Math.atan((p.oh/2 - yO)/fpx)/DEG - 0.35;
  return { pitch, roll: 0, yW: bW, m };
}
