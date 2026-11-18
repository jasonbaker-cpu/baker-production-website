/* Baker Production self-check: runs entirely in the browser. Photos are never uploaded.
   Same measurements as Baker's internal QC gate (qc_gate.py v5): brightness, haze, real blacks,
   colour kept, glowing orange/red, over-sharpening, clipped highlights, sky, near-duplicates, sizes.
   v12 (18 Nov 2026) LOCKED STANDARD: true to the raw first, bright second. Reference = Crib Creative.
   The tool never asks for more processing (no "add vibrance", "lift shadows", "brighten walls to 215").
   Optional: drop the same-named 0EV raws (.ARW) with the photos and each one is compared with the
   camera preview inside its raw. */
(function () {
  var VER = "v12 · 18 Nov 2026 · true to the raw"; /* bump on every rule change */
  /* STRICT 9.5 standard (6 Nov 2026): every photo must be inside the targets. One miss = not ready. */
  /* 18 Nov 2026: 31 Tokay Ln seller rejected a set (bleached floors, HDR exteriors). Targets now follow Crib Creative's measured numbers. */
  var B = { wallLo: 207, wallHi: 226, castLo: -3, castHi: 14, hazeL: 180, hazeSd: 42, flatInt: 95, stripL: 185, stripSat: 6, glow: 7, crunch: 6000, keep: 0.48, lLo: 155, lHi: 194, clip: 0.8, skySat: 0.50, skyLum: 198, skyPale: 0.05, extDark: 118, extShadow: 34, greenSat: 0.40, extHot: 235,
    extCast: 10, flatP5: 75, flatRng: 150,
    setCastLo: -2, setCastHi: 11, setSat: 7, setLLo: 165, setLHi: 186, setSd: 5, setFlat: 70 };
  var $ = function (id) { return document.getElementById(id); };
  var drop = $("scDrop"), input = $("scInput"), out = $("scOut"), jobEl = $("scJob");
  if (!drop) return;
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]; }); };

  ["dragenter", "dragover"].forEach(function (e) { drop.addEventListener(e, function (ev) { ev.preventDefault(); drop.classList.add("over"); }); });
  ["dragleave", "drop"].forEach(function (e) { drop.addEventListener(e, function (ev) { ev.preventDefault(); drop.classList.remove("over"); }); });
  drop.addEventListener("drop", function (ev) { run(ev.dataTransfer.files); });
  if (input && input.accept) input.accept = input.accept + ",.arw,.ARW";
  drop.addEventListener("click", function () { input.click(); });
  input.addEventListener("change", function () { run(input.files); input.value = ""; });

  function loadImg(file) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), im = new Image();
      im.onload = function () { res({ im: im, url: url }); };
      im.onerror = function () { URL.revokeObjectURL(url); rej(new Error("Can't read " + file.name)); };
      im.src = url;
    });
  }

  /* ---- raw comparison: the camera's own preview inside the .ARW is the "real house" reference ---- */
  function rawPreview(file) {
    return file.slice(0, 131072).arrayBuffer().then(function (buf) {
      var v = new DataView(buf), le = v.getUint16(0) === 0x4949; if (!le && v.getUint16(0) !== 0x4d4d) throw new Error("not a raw");
      var ifd = v.getUint32(4, le), n = v.getUint16(ifd, le), off = 0, len = 0;
      for (var i = 0; i < n; i++) { var e = ifd + 2 + i * 12, tag = v.getUint16(e, le), val = v.getUint32(e + 8, le); if (tag === 0x201) off = val; if (tag === 0x202) len = val; }
      if (!off || !len) throw new Error("no preview");
      return loadImg(new File([file.slice(off, off + len)], "p.jpg", { type: "image/jpeg" }));
    });
  }
  function labOf(d, n, gain) {
    var L = new Float32Array(n), A = new Float32Array(n), Bb = new Float32Array(n);
    var lin = function (c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    var f = function (t) { return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116; };
    for (var i = 0; i < n; i++) {
      var r = Math.min(1, lin(d[i * 4]) * gain), g = Math.min(1, lin(d[i * 4 + 1]) * gain), b = Math.min(1, lin(d[i * 4 + 2]) * gain);
      var X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.9505, Y = 0.2126 * r + 0.7152 * g + 0.0722 * b, Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.089;
      var fx = f(X), fy = f(Y), fz = f(Z); L[i] = 116 * fy - 16; A[i] = 500 * (fx - fy); Bb[i] = 200 * (fy - fz);
    }
    return [L, A, Bb];
  }
  function medianLin(d, n) {
    var h = new Uint32Array(1001), lin = function (c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    for (var i = 0; i < n; i++) h[Math.round((0.2126 * lin(d[i * 4]) + 0.7152 * lin(d[i * 4 + 1]) + 0.0722 * lin(d[i * 4 + 2])) * 1000)]++;
    var a = 0; for (var k = 0; k <= 1000; k++) { a += h[k]; if (a >= n / 2) return k / 1000; } return 0.5;
  }
  function rawKeep(finalIm, rawFile) {
    return rawPreview(rawFile).then(function (o) {
      var w = 480, h = 320, n = w * h, get = function (im) { var c = document.createElement("canvas"); c.width = w; c.height = h; var x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(im, 0, 0, w, h); return x.getImageData(0, 0, w, h).data; };
      var fd = get(finalIm), rd = get(o.im); URL.revokeObjectURL(o.url);
      var mf = Math.max(0.033, medianLin(fd, n)), mr = Math.max(0.0001, medianLin(rd, n));
      var F = labOf(fd, n, 1), R = labOf(rd, n, mf / mr), i, wa = [], wb = [];
      for (i = 0; i < n; i++) if (F[0][i] > 78 && Math.hypot(F[1][i], F[2][i]) < 7 && R[0][i] > 35 && R[0][i] < 97) { wa.push(R[1][i]); wb.push(R[2][i]); }
      var sa = 0, sb = 0; if (wa.length > n * 0.15) { wa.sort(function (p, q) { return p - q; }); wb.sort(function (p, q) { return p - q; }); sa = wa[wa.length >> 1]; sb = wb[wb.length >> 1]; }
      var cf = 0, nf = 0, cr = 0, nr = 0;
      for (i = 0; i < n; i++) { if (F[0][i] > 8 && F[0][i] < 97) { cf += Math.hypot(F[1][i], F[2][i]); nf++; } if (R[0][i] > 8 && R[0][i] < 97) { cr += Math.hypot(R[1][i] - sa, R[2][i] - sb); nr++; } }
      return nf && nr && cr > 0 ? (cf / nf) / (cr / nr) : null;
    }).catch(function () { return null; });
  }

  function analyse(file, rawFile) {
    return loadImg(file).then(function (o) {
      var im = o.im, W = im.naturalWidth, H = im.naturalHeight;
      var w = 800, h = Math.max(1, Math.round(800 * H / W));
      var c = document.createElement("canvas"); c.width = w; c.height = h;
      var x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(im, 0, 0, w, h);
      var d = x.getImageData(0, 0, w, h).data, n = w * h;
      var hist = new Uint32Array(256), sumL = 0, sumL2 = 0, clip = 0, darkN = 0, satSum = 0, glowN = 0, ch = [new Float32Array(512), new Float32Array(512)];
      for (var i = 0; i < d.length; i += 4) { var L = (d[i] + d[i + 1] + d[i + 2]) / 3; hist[L | 0]++; sumL += L; sumL2 += L * L; if (L < 100) darkN++; if (L >= 252) clip++;
        ch[(i / 4 / w) < h / 2 ? 0 : 1][(d[i] >> 5) * 64 + (d[i + 1] >> 5) * 8 + (d[i + 2] >> 5)]++; }
      var half = n / 2; for (var cb = 0; cb < 512; cb++) { ch[0][cb] /= half; ch[1][cb] /= half; }
      var pct = function (p) { var t = n * p, a = 0; for (var k = 0; k < 256; k++) { a += hist[k]; if (a >= t) return k; } return 255; };
      var p55 = pct(0.55), p5 = pct(0.05), p95 = pct(0.95);
      var wr = 0, wg = 0, wb = 0, wc = 0, topBlue = 0, skyS = 0, topN = 0, topRows = Math.floor(h / 3), top5 = Math.floor(h / 5), warmSky = 0, top5N = 0, green = 0, greenS = 0, ceil = 0, skyL = 0;
      for (var y = 0; y < h; y++) for (var xx = 0; xx < w; xx++) {
        var j = (y * w + xx) * 4, r = d[j], g = d[j + 1], b = d[j + 2], LL = (r + g + b) / 3, mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = (mx - mn) / (mx + 1);
        satSum += sat;
        if (mx > 115 && (mx - mn) > 0.45 * mx) { var hue = mx === r ? ((g - b) / (mx - mn)) * 60 : mx === g ? 120 + ((b - r) / (mx - mn)) * 60 : 240 + ((r - g) / (mx - mn)) * 60; if (hue >= 5 && hue <= 40) glowN++; }
        if (LL > p55 && LL < 250 && sat < 0.1) { wr += r; wg += g; wb += b; wc++; }
        if (y < topRows) { topN++; if (b > r + 15 && b > 120) { topBlue++; skyS += sat; skyL += LL; } if (LL > 175 && sat < 0.07) ceil++; }
        if (y < top5) { top5N++; if (LL > 140 && r > b + 12 && sat > 0.08 && sat < 0.55) warmSky++; }
        if (g > r + 8 && g > b + 8 && sat > 0.18) { green++; greenS += sat; }
      }
      var wall = wc ? [wr / wc, wg / wc, wb / wc] : [0, 0, 0];
      var blueFrac = topBlue / topN, ceilF = ceil / topN, warmF = warmSky / Math.max(1, top5N), greenF = green / n;
      /* Exterior = blue sky, or sunset/dusk sky + garden, or lots of garden. Interiors have a white ceiling in the top third. */
      var isExt = (blueFrac > 0.15 && ceilF < 0.5) || greenF > 0.15 || (greenF > 0.03 && (ceilF < 0.12 || (ceilF < 0.45 && warmF > 0.08)));
      var skySat0 = topBlue ? skyS / topBlue : 0;
      /* Dusk/twilight: warm clouds in the sky, or soft blue-violet sky with pink/orange clouds (premium dusk). */
      var twiBox = document.getElementById("scTwi");
      var dusk = isExt && twiBox && twiBox.checked && ((warmF > 0.08 && blueFrac < 0.3) || (warmF > 0.06 && skySat0 < 0.2 && topBlue && skyL / topBlue < 200));
      var s = document.createElement("canvas"); s.width = 9; s.height = 8; var sx = s.getContext("2d"); sx.drawImage(im, 0, 0, 9, 8);
      var sd = sx.getImageData(0, 0, 9, 8).data, gray = [];
      for (var q = 0; q < sd.length; q += 4) gray.push(0.299 * sd[q] + 0.587 * sd[q + 1] + 0.114 * sd[q + 2]);
      var hash = []; for (var ry = 0; ry < 8; ry++) for (var rx = 0; rx < 8; rx++) hash.push(gray[ry * 9 + rx + 1] > gray[ry * 9 + rx] ? 1 : 0);
      var lg = document.createElement("canvas"); lg.width = 24; lg.height = 16; var lgx = lg.getContext("2d"); lgx.drawImage(im, 0, 0, 24, 16);
      var ld = lgx.getImageData(0, 0, 24, 16).data, lay = []; for (var z = 0; z < ld.length; z += 4) lay.push(0.299 * ld[z] + 0.587 * ld[z + 1] + 0.114 * ld[z + 2]);
      var t = document.createElement("canvas"); t.width = 320; t.height = Math.round(320 * H / W); t.getContext("2d").drawImage(im, 0, 0, t.width, t.height);
      var thumb = t.toDataURL("image/jpeg", 0.7);
      /* over-sharpening: Laplacian variance at 1500px wide (same as the QC gate) */
      var cw = 1500, chh = Math.max(1, Math.round(1500 * H / W)), cc = document.createElement("canvas"); cc.width = cw; cc.height = chh;
      var ccx = cc.getContext("2d", { willReadFrequently: true }); ccx.imageSmoothingQuality = "high"; ccx.drawImage(im, 0, 0, cw, chh);
      var cd = ccx.getImageData(0, 0, cw, chh).data, gy = new Float32Array(cw * chh); for (var ci = 0; ci < cw * chh; ci++) gy[ci] = 0.299 * cd[ci * 4] + 0.587 * cd[ci * 4 + 1] + 0.114 * cd[ci * 4 + 2];
      var ls = 0, ls2 = 0, ln = 0; for (var cy = 1; cy < chh - 1; cy++) for (var cx = 1; cx < cw - 1; cx++) { var q0 = cy * cw + cx, lv = gy[q0 - 1] + gy[q0 + 1] + gy[q0 - cw] + gy[q0 + cw] - 4 * gy[q0]; ls += lv; ls2 += lv * lv; ln++; }
      var crunch = ls2 / ln - Math.pow(ls / ln, 2);
      var base = { sat: satSum / n * 100, dark: darkN / n, sd: Math.sqrt(Math.max(0, sumL2 / n - Math.pow(sumL / n, 2))), glow: glowN / n * 100, crunch: crunch, keep: null, hasRaw: !!rawFile };
      var fin = function (keep) { base.keep = keep; URL.revokeObjectURL(o.url); return Object.assign(base, { name: file.name, W: W, H: H, kind: isExt ? "EXT" : "INT", dusk: dusk, L: sumL / n, wallW: (wall[0] + wall[1] + wall[2]) / 3,
               cast: wall[0] - wall[2], p5: p5, rng: p95 - p5, p95: p95, greenF: greenF, greenSat: green ? greenS / green : 0, clip: clip / n * 100, skySat: topBlue ? skyS / topBlue : 0, skyLum: topBlue ? skyL / topBlue : 0, blueFrac: blueFrac, hash: hash, ch: ch, lay: lay, thumb: thumb }); };
      return rawFile ? rawKeep(im, rawFile).then(fin) : fin(null);
    });
  }

  var EYE = ["Compare at least three rooms and one exterior with the raw: floor, wall, bench, paver, brick and garden colour must match the real house. Accurate beats punchy.",
    "No halos or bright edges around trees, roofs or poles against the sky (sky replacement / over-sharpening).",
    "No pink/green/purple colour fringing in window views or on roofs and gutters.",
    "Window views clean and natural: no grey or glowing pulls, no ghosting.",
    "Verticals dead straight on every photo (walls, door frames, cabinets).",
    "Sky on every exterior: soft pale blue fading to near-white at the horizon, light wispy clouds, never deep or saturated blue. Edges masked cleanly, no cut-off hills or trees.",
    "Grass natural green and even, never lime or neon.",
    "No AI artefacts: warped lines, smeared textures, melted objects.",
    "Only one photo per angle: drop near-duplicates and older versions of redone files.",
    "Every photo same size and crop, sharp, no noise in shadows.",
    "Dusk/twilight shots: natural sunset sky (soft pink, peach or golden is fine, no dark fake purple), every window and light glowing, lawn green, tight framing."];
  function flags(r) {
    var f = [];
    if (r.kind === "INT") {
      if (r.wallW > B.wallHi) f.push({ k: "hot", t: "Walls blown too white (" + r.wallW.toFixed(0) + "). Pull back until the wall shows its real colour, as in the raw." });
      if (r.cast < B.castLo) f.push({ k: "cold", t: "Walls grey/blue (warmth " + r.cast.toFixed(1) + "). Match the wall colour in the raw." });
      if (r.cast > B.castHi) f.push({ k: "cream", t: "Walls cream/yellow (warmth +" + r.cast.toFixed(1) + "). Only fix if they are warmer than the raw: match the raw, do not force white." });
      if (r.L < B.lLo && r.wallW < 214) f.push({ k: "dark", t: "Room too dark (brightness " + r.L.toFixed(0) + ", target 165-185)." }); /* dark floors/joinery with good walls are fine */
      if (r.L > B.lHi) f.push({ k: "bright", t: "Room too bright (brightness " + r.L.toFixed(0) + ", target 165-185). Bring exposure down." });
      if (r.L >= B.hazeL && r.sd < B.hazeSd && r.dark >= 0.03) f.push({ k: "haze", t: "Hazy: blacks and shadows lifted (contrast " + r.sd.toFixed(0) + ", target 42+). Pull blacks and shadows back down, keep the exposure." });
      else if (r.p5 > B.flatInt && r.dark >= 0.03) f.push({ k: "flat", t: "Blacks lifted (darkest areas " + r.p5 + ", target 70 or less). Dark objects must stay black." });
      if (r.keep == null && r.L >= B.stripL && r.sat < B.stripSat) f.push({ k: "strip", t: "Very little colour left (" + r.sat.toFixed(1) + ", target 8+)." + (r.dark >= 0.03 ? " Floors and walls look bleached: put the real colour back from the raw." : " If this room has a timber floor or coloured walls in the raw, put that colour back. Add the raw file to check.") });
      if (r.keep != null && r.keep < B.keep) f.push({ k: "raw", t: "Colour stripped compared with the raw: keeps only " + Math.round(r.keep * 100) + "% of the real colour (good jobs keep 55%+). Put the floor and wall colour back." });
      if (r.crunch > B.crunch) f.push({ k: "crunch", t: "Over-sharpened / crunchy (detail " + r.crunch.toFixed(0) + ", target under " + B.crunch + "). Remove extra sharpening, clarity and texture." });
    } else {
      if (!r.dusk && r.blueFrac > 0.15 && (r.skyLum < B.skyLum || r.skySat > B.skySat)) f.push({ k: "sky", t: "Sky too deep/dark blue (sky brightness " + r.skyLum.toFixed(0) + ", target 200+). Soft pale blue, near-white at the horizon, no dark gradient at the top." });
      if (!r.dusk && r.blueFrac > 0.15 && r.skySat < B.skyPale) f.push({ k: "pale", t: "Sky is grey/white with no blue (" + r.skySat.toFixed(2) + ", target 0.15-0.30). Add a soft pale blue sky." });
      if (!r.dusk && r.L > 182) f.push({ k: "washed", t: "Exterior washed out (brightness " + r.L.toFixed(0) + ", target 135-180). Bring it back to the natural light in the raw." });
      if (r.L < (r.dusk ? 100 : B.extDark)) f.push({ k: "dark", t: "Exterior darker than usual (brightness " + r.L.toFixed(0) + "). Check it against the raw and match the raw's sunlit areas. Do not add HDR or lift shadows flat." });
      if (!r.dusk && r.glow > B.glow) f.push({ k: "glow", t: "Glowing orange/red (" + r.glow.toFixed(0) + "% of the photo). Pavers, brick and roof tiles must be no brighter or more orange than the raw." });
      if (!r.dusk && r.p95 > B.extHot) f.push({ k: "hot", t: "Bright areas too hot (" + r.p95 + ", target 230 or less). Pull highlights back on ground, paths and walls." });
      if (r.p5 > B.flatP5 && r.rng < B.flatRng) f.push({ k: "flat", t: "Flat HDR look, no depth (blacks lifted to " + r.p5 + ", tonal range " + r.rng + "). Let the shadows be shadows: set a true black point." });
      if (!r.dusk && r.cast > B.extCast) f.push({ k: "orange", t: "Yellow/orange cast on the exterior (warmth +" + r.cast.toFixed(1) + "). Match the white balance of the raw." });
    }
    if (r.clip > B.clip) f.push({ k: "clip", t: "Blown highlights (" + r.clip.toFixed(1) + "% clipped). Recover windows/whites." });
    return f;
  }

  function run(files) {
    var raws = {}; Array.prototype.forEach.call(files, function (f) { if (/\.(arw|dng)$/i.test(f.name)) raws[f.name.replace(/\.[^.]+$/, "").toLowerCase()] = f; });
    files = Array.prototype.filter.call(files, function (f) { return /^image\/(jpeg|png|webp)$/.test(f.type) || /\.(jpe?g|png|webp)$/i.test(f.name); });
    if (!files.length) return;
    files.sort(function (a, b) { return a.name.localeCompare(b.name, undefined, { numeric: true }); });
    out.innerHTML = '<p class="meta">Checking ' + files.length + ' photos… (stays on your computer)</p>';
    var res = [], i = 0;
    (function next() {
      if (i >= files.length) return report(res);
      out.innerHTML = '<p class="meta">Checking ' + (i + 1) + ' of ' + files.length + ': ' + esc(files[i].name) + '</p>';
      analyse(files[i], raws[files[i].name.replace(/\.[^.]+$/, "").toLowerCase()]).then(function (r) { res.push(r); }, function () { }).then(function () { i++; setTimeout(next, 0); });
    })();
  }

  function report(rs) {
    rs.forEach(function (r) { r.f = flags(r); });
    var ints = rs.filter(function (r) { return r.kind === "INT"; });
    var avg = function (a, k) { return a.length ? a.reduce(function (s, r) { return s + r[k]; }, 0) / a.length : 0; };
    var aw = avg(ints, "wallW"), ac = avg(ints, "cast"), al = avg(ints, "L");
    var dk = ints.filter(function (r) { return r.dark >= 0.03; }), asat = avg(dk, "sat"), nRaw = rs.filter(function (r) { return r.keep != null; }).length;
    var sd = ints.length ? Math.sqrt(avg(ints.map(function (r) { return { v: Math.pow(r.wallW - aw, 2) }; }), "v")) : 0;
    var dupes = [];
    var corr = function (x, y) { var mx = 0, my = 0, m = x.length; for (var q = 0; q < m; q++) { mx += x[q]; my += y[q]; } mx /= m; my /= m;
      var sxy = 0, sxx = 0, syy = 0; for (q = 0; q < m; q++) { var u = x[q] - mx, v = y[q] - my; sxy += u * v; sxx += u * u; syy += v * v; } return sxy / Math.sqrt(sxx * syy + 1e-9); };
    for (var a = 0; a < rs.length; a++) for (var b = a + 1; b < rs.length; b++) {
      var dd = 0; for (var k = 0; k < 64; k++) if (rs[a].hash[k] !== rs[b].hash[k]) dd++;
      var hi = 0; for (var hb = 0; hb < 512; hb++) hi += Math.min(rs[a].ch[0][hb], rs[b].ch[0][hb]) + Math.min(rs[a].ch[1][hb], rs[b].ch[1][hb]); hi /= 2;
      var co = corr(rs[a].lay, rs[b].lay), bothExt = rs[a].kind === "EXT" && rs[b].kind === "EXT";
      if (dd <= 6 || (hi >= 0.88 && co >= 0.7) || (hi >= 0.84 && co >= 0.85) || (bothExt && hi >= 0.8 && co >= 0.75)) dupes.push([rs[a].name, rs[b].name, dd]);
    }
    var sizes = {}; rs.forEach(function (r) { var key = r.W + "x" + r.H; sizes[key] = (sizes[key] || 0) + 1; });
    /* Portrait and landscape are both fine: compare long side and crop ratio regardless of orientation. */
    var ars = rs.map(function (r) { return Math.min(r.W, r.H) / Math.max(r.W, r.H); }), arSpread = rs.length ? Math.max.apply(null, ars) - Math.min.apply(null, ars) : 0;
    var widths = {}; rs.forEach(function (r) { widths[Math.max(r.W, r.H)] = 1; });
    var setIssues = [];
    if (ints.length) {
      if (ac < B.setCastLo) setIssues.push("Whole set cold/grey: average warmth " + ac.toFixed(1) + ". Match the wall colour in the raws.");
      if (ac > B.setCastHi) setIssues.push("Whole set warm/cream: average warmth +" + ac.toFixed(1) + ". Check against the raws: only fix if warmer than the real walls.");
      if (dk.length >= 3 && asat < B.setSat) setIssues.push("Colour flat across the set (" + asat.toFixed(1) + ", target 8+). The rooms have lost their real floor and wall colour.");
      if (al < B.setLLo && aw < 213) setIssues.push("Whole set too dark: average brightness " + al.toFixed(0) + " (target 165-185).");
      if (al > B.setLHi) setIssues.push("Whole set too bright: average brightness " + al.toFixed(0) + " (target 165-185).");
      if (sd > B.setSd) setIssues.push("Photos don't match each other (wall brightness varies ±" + sd.toFixed(0) + "). Even out the set.");
    }
    if (Object.keys(widths).length > 1 || arSpread > 0.0015) setIssues.push((Object.keys(widths).length > 1 ? "Mixed resolutions (long side " + Object.keys(widths).join(" / ") + "px): " : "Inconsistent crops: ") + Object.keys(sizes).join(", ") + ". Export every photo full size at the same 3:2 crop.");
    var flagged = rs.filter(function (r) { return r.f.length; });
    /* Strict: 9.5+ only with zero issues. Any flagged photo, duplicate or set issue caps the score at 9. */
    var nIssues = setIssues.length + flagged.length + dupes.length;
    var score = 10 - setIssues.length * 0.4 - Math.min(2.5, flagged.length * 0.15) - Math.min(1.5, dupes.length * 0.4);
    if (nIssues) score = Math.min(9, score);
    score = Math.max(4, Math.floor(score * 2) / 2);
    var verdict = !nIssues ? "Numbers pass. Do the eye checks below before delivering" : score >= 8.5 ? "NOT READY: fix every item below, then re-check" : score >= 7 ? "NOT READY: needs real work before delivery" : "Redo the set";
    var cls = score >= 9.5 ? "s-hi" : score >= 8.5 ? "s-mid" : "s-lo";
    var job = (jobEl.value || "").trim() || "Untitled job";
    var when = new Date().toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" });

    var html = '<div class="scr" id="scReport"><div class="scr-head"><div><div class="job">' + esc(job) + '</div><div class="meta">Self-check ' + VER + ' · run ' + esc(when) + ' · ' + rs.length + ' photos (' + ints.length + ' interior, ' + (rs.length - ints.length) + ' exterior)</div></div><span class="score ' + cls + '">' + score + '/10 est.</span></div>' +
      '<p class="vd"><b>' + verdict + '.</b></p>' +
      '<div class="scr-stats"><div><b>' + (dk.length ? asat.toFixed(1) : "–") + '</b><span>Colour (target 8+)</span></div><div><b>' + nRaw + '</b><span>Checked against raw</span></div><div><b>' + al.toFixed(0) + '</b><span>Brightness (165-185)</span></div><div><b>' + flagged.length + '</b><span>Photos flagged</span></div><div><b>' + dupes.length + '</b><span>Possible duplicates</span></div></div>';
    if (!nRaw) html += '<p class="vd">No raw files added. To check colour against the real house, drop the same-named 0EV raw (e.g. DSC01234.ARW for DSC01234.jpg) for at least three rooms together with the photos. Raws stay on your computer.</p>';
    if (setIssues.length) html += '<h4>Whole-set issues</h4><ul>' + setIssues.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ul>";
    if (dupes.length) html += '<h4>Possible duplicates (check, then remove one)</h4><ul>' + dupes.map(function (p) { return "<li>" + esc(p[0]) + " ≈ " + esc(p[1]) + "</li>"; }).join("") + "</ul>";
    html += '<h4>Photos to fix</h4>' + (flagged.length ? '<div class="scr-grid">' + flagged.map(function (r) {
      return '<div class="note"><img src="' + r.thumb + '" alt=""><p><span class="tag bad">Fix</span> <span class="meta">' + esc(r.name) + ' · ' + r.kind + '</span></p><ul>' + r.f.map(function (x) { return "<li>" + esc(x.t) + "</li>"; }).join("") + '</ul></div>';
    }).join("") + "</div>" : '<p>None. Every photo is inside the targets.</p>');
    html += '<h4>Eye checks (zoom to 100% on every photo; tools can\'t catch these)</h4><ul class="scr-eye">' + EYE.map(function (e) { return "<li>☐ " + esc(e) + "</li>"; }).join("") + "</ul>";
    html += '<details class="scr-all"><summary>All photo numbers</summary><table><thead><tr><th>File</th><th>Type</th><th>Walls</th><th>Warmth</th><th>Brightness</th><th>Colour</th><th>Vs raw</th><th>Detail</th><th>Clipped</th><th>Size</th></tr></thead><tbody>' +
      rs.map(function (r) { return "<tr" + (r.f.length ? ' class="flag"' : "") + "><td>" + esc(r.name) + "</td><td>" + r.kind + "</td><td>" + r.wallW.toFixed(0) + "</td><td>" + r.cast.toFixed(1) + "</td><td>" + r.L.toFixed(0) + "</td><td>" + r.sat.toFixed(1) + "</td><td>" + (r.keep == null ? "–" : Math.round(r.keep * 100) + "%") + "</td><td>" + r.crunch.toFixed(0) + "</td><td>" + r.clip.toFixed(1) + "%</td><td>" + r.W + "×" + r.H + "</td></tr>"; }).join("") + "</tbody></table></details>" +
      '<p class="meta" style="margin-top:12px">Strict check: one flagged photo means not ready. Covered patios can read as "interior" and painted feature walls can trip the colour checks. The tool never asks for more HDR, saturation, sharpening or shadow lift: when unsure, match the raw; if a flag is genuinely wrong, say so in your hand-back note. Baker checks every job by eye.</p>' +
      '<div class="scr-btns"><button type="button" id="scCopy">Copy report text</button><button type="button" id="scPrint">Print / save PDF</button></div></div>';
    out.innerHTML = html;

    var txt = "BAKER SELF-CHECK " + VER + ": " + job + "\n" + when + " · " + rs.length + " photos\nScore (est.): " + score + "/10, " + verdict +
      "\nColour " + (dk.length ? asat.toFixed(1) : "-") + " (target 8+) · Brightness " + al.toFixed(0) + " (165-185) · " + nRaw + " photos checked against raw\n" +
      (setIssues.length ? "\nWHOLE SET:\n- " + setIssues.join("\n- ") + "\n" : "") +
      (dupes.length ? "\nPOSSIBLE DUPLICATES:\n- " + dupes.map(function (p) { return p[0] + " ≈ " + p[1]; }).join("\n- ") + "\n" : "") +
      "\nPHOTOS TO FIX:\n" + (flagged.length ? flagged.map(function (r) { return "- " + r.name + ": " + r.f.map(function (x) { return x.t; }).join(" "); }).join("\n") : "- None") +
      "\n\nEYE CHECKS (confirm each):\n- " + EYE.join("\n- ");
    $("scCopy").onclick = function () {
      var btn = this;
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { btn.textContent = "Copied ✓"; }, function () {
        var ta = document.createElement("textarea"); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); btn.textContent = "Copied ✓"; } catch (e) { } ta.remove();
      });
    };
    $("scPrint").onclick = function () { document.body.classList.add("printing"); window.print(); setTimeout(function () { document.body.classList.remove("printing"); }, 500); };
  }
})();
