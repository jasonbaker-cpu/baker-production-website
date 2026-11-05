/* Baker Production shooter self-check. Runs entirely in the browser; files are never uploaded.
   Reads EXIF + the embedded preview from Sony .ARW (or camera .JPG), groups brackets into scenes,
   then checks per scene: camera level / verticals, sharpness, darkest-frame window blowout,
   brightest-frame black shadows, bracket count + spread, ISO / aperture / focal length,
   duplicate angles, and coverage against the package minimum. */
(function () {
  var T = { roll: 1.0, keystone: 1.5, isoMax: 400, fLo: 5.6, fHi: 13, focLo: 14.5, focHi: 30, sharpRel: 0.45,
            blown: 0.6, blownExt: 2.5, crushed: 4, evSpread: 3.5, dupe: 9 };
  var $ = function (id) { return document.getElementById(id); };
  var drop = $("scDrop"), input = $("scInput"), out = $("scOut");
  if (!drop) return;
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]; }); };
  var store = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };

  /* ---------- form setup ---------- */
  var who = $("scShooter"), pkg = $("scPkg");
  who.innerHTML = '<option value="">Choose…</option>' + (window.SHOOTERS || []).map(function (s) { return '<option>' + esc(s) + '</option>'; }).join("");
  var cov = window.COVERAGE || { Sales: 25 };
  pkg.innerHTML = Object.keys(cov).map(function (k) { return '<option value="' + esc(k) + '">' + esc(k) + ' (' + cov[k] + '+ scenes)</option>'; }).join("");
  pkg.value = Object.keys(cov)[1] || Object.keys(cov)[0];
  if (store.get("bk_shooter")) who.value = store.get("bk_shooter");
  who.addEventListener("change", function () { store.set("bk_shooter", who.value); });

  ["dragenter", "dragover"].forEach(function (e) { drop.addEventListener(e, function (ev) { ev.preventDefault(); drop.classList.add("over"); }); });
  ["dragleave", "drop"].forEach(function (e) { drop.addEventListener(e, function (ev) { ev.preventDefault(); drop.classList.remove("over"); }); });
  drop.addEventListener("drop", function (ev) { run(ev.dataTransfer.files); });
  drop.addEventListener("click", function () { input.click(); });
  drop.addEventListener("keydown", function (ev) { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); input.click(); } });
  input.addEventListener("change", function () { run(input.files); input.value = ""; });

  /* ---------- EXIF / TIFF ---------- */
  var SZ = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8, 13: 4 };
  function parseTiff(dv, base) {
    var le = dv.getUint16(base) === 0x4949, len = dv.byteLength;
    var u16 = function (o) { return dv.getUint16(base + o, le); }, u32 = function (o) { return dv.getUint32(base + o, le); };
    var tags = {}, jpegs = [], seen = {};
    function val(e, type, count) {
      var sz = (SZ[type] || 1) * count, off = sz <= 4 ? e + 8 : u32(e + 8);
      if (base + off + sz > len) return null;
      if (type === 2) { var s = ""; for (var i = 0; i < count; i++) { var c = dv.getUint8(base + off + i); if (!c) break; s += String.fromCharCode(c); } return s; }
      var r = [];
      for (var k = 0; k < Math.min(count, 16); k++) {
        var o = off + k * (SZ[type] || 1);
        if (type === 3) r.push(u16(o)); else if (type === 4 || type === 13) r.push(u32(o));
        else if (type === 5) { var d = u32(o + 4); r.push(d ? u32(o) / d : 0); }
        else if (type === 10) { var dd = dv.getInt32(base + o + 4, le); r.push(dd ? dv.getInt32(base + o, le) / dd : 0); }
        else if (type === 11) r.push(dv.getFloat32(base + o, le)); else if (type === 12) r.push(dv.getFloat64(base + o, le));
        else if (type === 8) r.push(dv.getInt16(base + o, le)); else if (type === 9) r.push(dv.getInt32(base + o, le));
        else r.push(dv.getUint8(base + o));
      }
      return count === 1 ? r[0] : r;
    }
    function ifd(off, depth) {
      if (!off || seen[off] || depth > 4 || base + off + 2 > len) return;
      seen[off] = 1;
      var n = u16(off), loc = {};
      if (n > 1000 || base + off + 2 + n * 12 > len) return;
      for (var i = 0; i < n; i++) {
        var e = off + 2 + i * 12, tag = u16(e), type = u16(e + 2), count = u32(e + 4);
        var v = val(e, type, count); loc[tag] = v; if (!(tag in tags)) tags[tag] = v;
      }
      if (loc[0x0201] && loc[0x0202]) jpegs.push({ off: base + loc[0x0201], len: loc[0x0202] });
      if (loc[0x8769]) ifd(loc[0x8769], depth + 1);
      if (loc[0x014A]) [].concat(loc[0x014A]).forEach(function (o) { ifd(o, depth + 1); });
      var nx = base + off + 2 + n * 12 + 4 <= len ? u32(off + 2 + n * 12) : 0;
      if (nx) ifd(nx, depth);
    }
    ifd(u32(4), 0);
    return { tags: tags, jpegs: jpegs };
  }
  function readExif(file) {
    var isJpg = /\.jpe?g$/i.test(file.name);
    return file.slice(0, isJpg ? 262144 : 4194304).arrayBuffer().then(function (buf) {
      var dv = new DataView(buf), r = null;
      if (isJpg) {
        if (dv.getUint16(0) !== 0xFFD8) return null;
        var p = 2;
        while (p + 4 < dv.byteLength) {
          var m = dv.getUint16(p), l = dv.getUint16(p + 2);
          if (m === 0xFFE1 && dv.getUint32(p + 4) === 0x45786966) { r = parseTiff(dv, p + 10); break; }
          if ((m & 0xFF00) !== 0xFF00 || m === 0xFFDA) break;
          p += 2 + l;
        }
      } else {
        var bo = dv.getUint16(0);
        if (bo !== 0x4949 && bo !== 0x4D4D) return null;
        r = parseTiff(dv, 0);
      }
      if (!r) return null;
      var t = r.tags, dt = t[0x9003] || t[0x0132] || "", ss = t[0x9291] || "0";
      var ms = 0, mm = /^(\d{4}):(\d\d):(\d\d) (\d\d):(\d\d):(\d\d)/.exec(dt);
      if (mm) ms = Date.UTC(+mm[1], mm[2] - 1, +mm[3], +mm[4], +mm[5], +mm[6]) + parseFloat("0." + String(ss).replace(/\D/g, "") || 0) * 1000;
      var make = String(t[0x010F] || ""), model = String(t[0x0110] || "");
      var exp = +t[0x829A] || 0, fn = +t[0x829D] || 0, iso = +[].concat(t[0x8827] || 0)[0] || 0;
      var foc = +t[0x920A] || 0, foc35 = +t[0xA405] || 0;
      if (!foc35 && foc) foc35 = /ILCE-6|NEX|ILCE-QX|ZV-E10/i.test(model) ? foc * 1.5 : foc;
      var js = r.jpegs.filter(function (j) { return j.len > 20000 && j.off + j.len <= file.size; }).sort(function (a, b) { return b.len - a.len; });
      var big = js.filter(function (j) { return j.len < 1500000; })[0] || js[js.length - 1]; // ~1600px preview decodes fast
      return { ms: ms, make: make, model: model, exp: exp, fn: fn, iso: iso, foc: foc, foc35: foc35,
        bias: t[0x9204] == null ? null : +t[0x9204], orient: +t[0x0112] || 1, preview: big || null,
        ev: exp && fn ? Math.log2(exp * (iso || 100) / 100 / (fn * fn)) : null };
    }).catch(function () { return null; });
  }

  /* ---------- image loading ---------- */
  function bitmapFor(f) {
    var blob = /\.jpe?g$/i.test(f.file.name) ? f.file : (f.meta.preview ? f.file.slice(f.meta.preview.off, f.meta.preview.off + f.meta.preview.len, "image/jpeg") : null);
    if (!blob) return Promise.reject(new Error("no preview"));
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(blob), im = new Image();
      im.onload = function () { res({ im: im, url: url, raw: !/\.jpe?g$/i.test(f.file.name) }); };
      im.onerror = function () { URL.revokeObjectURL(url); rej(new Error("bad preview")); };
      im.src = url;
    });
  }
  function draw(f, maxW) {
    return bitmapFor(f).then(function (o) {
      var im = o.im, W = im.naturalWidth, H = im.naturalHeight, ot = o.raw ? f.meta.orient : 1;
      var rot = ot === 6 || ot === 8, w = Math.min(maxW, rot ? H : W), h = Math.round(w * (rot ? W : H) / (rot ? H : W));
      var c = document.createElement("canvas"); c.width = w; c.height = h;
      var x = c.getContext("2d", { willReadFrequently: true });
      if (ot === 6) { x.translate(w, 0); x.rotate(Math.PI / 2); x.drawImage(im, 0, 0, h, w); }
      else if (ot === 8) { x.translate(0, h); x.rotate(-Math.PI / 2); x.drawImage(im, 0, 0, h, w); }
      else if (ot === 3) { x.translate(w, h); x.rotate(Math.PI); x.drawImage(im, 0, 0, w, h); }
      else x.drawImage(im, 0, 0, w, h);
      URL.revokeObjectURL(o.url);
      return c;
    });
  }

  /* ---------- measurements ---------- */
  function gray(c) {
    var w = c.width, h = c.height, d = c.getContext("2d").getImageData(0, 0, w, h).data, g = new Float32Array(w * h);
    for (var i = 0, j = 0; j < g.length; i += 4, j++) g[j] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    return { g: g, w: w, h: h, d: d };
  }
  // Hough on near-vertical edges. Returns roll (deg, + = leaning right at top) and keystone (deg of lean at frame edge; - = converge at top = camera pointed up).
  function verticals(G) {
    var w = G.w, h = G.h, g = G.g, cy = h / 2, NA = 97, A0 = -12, AS = 0.25, XB = 2, NX = Math.ceil(w / XB) + 40;
    var tans = new Float32Array(NA); for (var a = 0; a < NA; a++) tans[a] = Math.tan((A0 + a * AS) * Math.PI / 180);
    var acc = new Uint16Array(NA * NX);
    for (var y = 1; y < h - 1; y += 1) for (var x = 1; x < w - 1; x++) {
      var i = y * w + x;
      var gx = (g[i - w + 1] + 2 * g[i + 1] + g[i + w + 1]) - (g[i - w - 1] + 2 * g[i - 1] + g[i + w - 1]);
      var gy = (g[i + w - 1] + 2 * g[i + w] + g[i + w + 1]) - (g[i - w - 1] + 2 * g[i - w] + g[i - w + 1]);
      var ax = Math.abs(gx);
      if (ax < 90 || ax < 3 * Math.abs(gy)) continue;
      // only vote for line angles that match this pixel's own edge direction (kills tree/foliage noise)
      var th = -Math.atan(gy / gx) * 180 / Math.PI, a1 = Math.max(0, Math.floor((th - 1.5 - A0) / AS)), a2 = Math.min(NA - 1, Math.ceil((th + 1.5 - A0) / AS));
      var dy = y - cy;
      for (a = a1; a <= a2; a++) { var bx = Math.round((x - dy * tans[a]) / XB) + 20; if (bx >= 0 && bx < NX) acc[a * NX + bx]++; }
    }
    var lines = [], minV = h * 0.2, used = new Uint8Array(NA * NX);
    for (var k = 0; k < 14; k++) {
      var best = 0, bi = -1;
      for (var q = 0; q < acc.length; q++) if (!used[q] && acc[q] > best) { best = acc[q]; bi = q; }
      if (bi < 0 || best < minV) break;
      var ba = Math.floor(bi / NX), bxx = bi % NX;
      lines.push({ lean: -(A0 + ba * AS), xn: ((bxx - 20) * XB - w / 2) / (w / 2), v: best });
      for (var da = -8; da <= 8; da++) for (var dx = -8; dx <= 8; dx++) { var aa = ba + da, xx2 = bxx + dx; if (aa >= 0 && aa < NA && xx2 >= 0 && xx2 < NX) used[aa * NX + xx2] = 1; }
    }
    if (lines.length < 2) return { n: lines.length };
    var sw = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
    lines.forEach(function (l) { sw += l.v; sx += l.v * l.xn; sy += l.v * l.lean; sxx += l.v * l.xn * l.xn; sxy += l.v * l.xn * l.lean; });
    var mx = sx / sw, my = sy / sw, vx = sxx / sw - mx * mx, k2 = 0;
    if (lines.length >= 4 && vx > 0.1) k2 = (sxy / sw - mx * my) / vx;
    // robust roll: weighted median of leans after removing keystone
    var res = lines.map(function (l) { return { r: l.lean - k2 * l.xn, v: l.v }; }).sort(function (a, b) { return a.r - b.r; }), half = sw / 2, acc2 = 0, roll = res[0].r;
    for (var z = 0; z < res.length; z++) { acc2 += res[z].v; if (acc2 >= half) { roll = res[z].r; break; } }
    return { n: lines.length, roll: roll, key: lines.length >= 4 ? k2 : 0 };
  }
  function sharpness(G) {
    var w = G.w, h = G.h, g = G.g, s = 0, s2 = 0, n = 0;
    for (var y = 1; y < h - 1; y += 2) for (var x = 1; x < w - 1; x += 2) { var i = y * w + x, l = 4 * g[i] - g[i - 1] - g[i + 1] - g[i - w] - g[i + w]; s += l; s2 += l * l; n++; }
    return s2 / n - (s / n) * (s / n);
  }
  function tones(G) {
    var d = G.d, n = d.length / 4, hi = 0, lo = 0, blue = 0, top = 0, rows = Math.floor(G.h / 3) * G.w * 4;
    for (var i = 0; i < d.length; i += 4) {
      var r = d[i], gg = d[i + 1], b = d[i + 2];
      if (Math.min(r, gg, b) >= 250) hi++;
      if ((r + gg + b) / 3 < 6) lo++;
      if (i < rows) { top++; if (b > r + 15 && b > 120) blue++; }
    }
    return { hi: hi / n * 100, lo: lo / n * 100, blue: blue / top };
  }
  function dhash(c) {
    var s = document.createElement("canvas"); s.width = 9; s.height = 8; var sx = s.getContext("2d"); sx.drawImage(c, 0, 0, 9, 8);
    var d = sx.getImageData(0, 0, 9, 8).data, g = [], h = [];
    for (var q = 0; q < d.length; q += 4) g.push(0.299 * d[q] + 0.587 * d[q + 1] + 0.114 * d[q + 2]);
    for (var y = 0; y < 8; y++) for (var x = 0; x < 8; x++) h.push(g[y * 9 + x + 1] > g[y * 9 + x] ? 1 : 0);
    return h;
  }
  var ham = function (a, b) { var n = 0; for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) n++; return n; };

  /* ---------- grouping ---------- */
  function group(items) {
    items.sort(function (a, b) { return (a.meta.ms - b.meta.ms) || a.file.name.localeCompare(b.file.name, undefined, { numeric: true }); });
    var scenes = [], cur = null, prev = null;
    items.forEach(function (it) {
      var m = it.meta, brk = !cur;
      if (cur && prev) {
        var gap = (m.ms - prev.meta.ms) / 1000;
        if (!m.ms || !prev.meta.ms) brk = true;
        else if (gap > (prev.meta.exp || 0) + 3.5) brk = true;
        else if (m.ev != null && cur.some(function (c) { return c.meta.ev != null && Math.abs(c.meta.ev - m.ev) < 0.3; })) brk = true;
      }
      if (brk) { cur = []; scenes.push(cur); }
      cur.push(it); prev = it;
    });
    return scenes.map(function (fr) {
      var withEv = fr.filter(function (f) { return f.meta.ev != null; });
      var byEv = withEv.slice().sort(function (a, b) { return a.meta.ev - b.meta.ev; });
      var base = fr[0];
      if (fr.some(function (f) { return f.meta.bias != null; })) base = fr.slice().sort(function (a, b) { return Math.abs(a.meta.bias || 0) - Math.abs(b.meta.bias || 0); })[0];
      else if (byEv.length) base = byEv[Math.floor(byEv.length / 2)];
      return { frames: fr, base: base, dark: byEv[0] || base, bright: byEv[byEv.length - 1] || base,
               spread: byEv.length > 1 ? byEv[byEv.length - 1].meta.ev - byEv[0].meta.ev : 0 };
    });
  }

  /* ---------- run ---------- */
  function run(list) {
    var files = [].slice.call(list || []).filter(function (f) { return /\.(arw|jpe?g)$/i.test(f.name); });
    if (!files.length) { out.innerHTML = '<p class="meta">No .ARW or .JPG files found.</p>'; return; }
    out.innerHTML = '<p class="meta" id="scProg">Reading ' + files.length + ' files…</p><div class="prog"><i id="scBar"></i></div>';
    var items = [], skipped = 0, noMeta = 0, i = 0;
    function nextMeta() {
      if (i >= files.length) return Promise.resolve();
      var f = files[i++];
      return readExif(f).then(function (m) {
        if (!m) { noMeta++; m = { ms: 0, ev: null, bias: null, orient: 1, preview: null, model: "", make: "" }; }
        if (/DJI|Hasselblad/i.test(m.make + m.model) || /^DJI_/i.test(f.name)) { skipped++; }
        else if (!/\.jpe?g$/i.test(f.name) && !m.preview) { noMeta++; }
        else items.push({ file: f, meta: m });
        bar(i / files.length * 0.3, "Reading files " + i + "/" + files.length);
        return nextMeta();
      });
    }
    nextMeta().then(function () {
      if (!items.length) { out.innerHTML = '<p class="meta">Couldn\'t read any of those files' + (skipped ? ' (' + skipped + ' drone files skipped)' : '') + '.</p>'; return; }
      var scenes = group(items), k = 0;
      function nextScene() {
        if (k >= scenes.length) return Promise.resolve();
        var s = scenes[k++];
        bar(0.3 + k / scenes.length * 0.7, "Checking scene " + k + "/" + scenes.length);
        return draw(s.base, 800).then(function (c) {
          var G = gray(c); s.vert = verticals(G); s.sharp = sharpness(G); s.tone = tones(G); s.hash = dhash(c);
          var bm = s.base.meta, lv = bm.exp && bm.fn ? Math.log2(bm.fn * bm.fn / bm.exp) - Math.log2((bm.iso || 100) / 100) - (bm.bias || 0) : null;
          s.ext = lv != null ? (lv >= 11.5 || (lv >= 10 && s.tone.blue > 0.05)) : s.tone.blue > 0.15; s.thumb = (function () { var t = document.createElement("canvas"); t.width = 360; t.height = Math.round(360 * c.height / c.width); t.getContext("2d").drawImage(c, 0, 0, t.width, t.height); return t.toDataURL("image/jpeg", 0.72); })();
          return s.dark === s.base ? s.tone : draw(s.dark, 480).then(function (cc) { return tones(gray(cc)); });
        }).then(function (td) { s.darkTone = td;
          return s.bright === s.base ? s.tone : draw(s.bright, 480).then(function (cc) { return tones(gray(cc)); });
        }).then(function (tb) { s.brightTone = tb; }).catch(function () { s.err = true; }).then(nextScene);
      }
      return nextScene().then(function () { report(scenes, { skipped: skipped, noMeta: noMeta, files: files.length }); });
    });
  }
  function bar(p, t) { var b = $("scBar"), pr = $("scProg"); if (b) b.style.width = Math.round(p * 100) + "%"; if (pr) pr.textContent = t; }

  /* ---------- scoring + report ---------- */
  function report(scenes, info) {
    var ok = scenes.filter(function (s) { return !s.err; });
    var counts = {}; scenes.forEach(function (s) { counts[s.frames.length] = (counts[s.frames.length] || 0) + 1; });
    var mode = +Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a] || b - a; })[0];
    var med = function (arr) { arr = arr.slice().sort(function (a, b) { return a - b; }); return arr[Math.floor(arr.length / 2)] || 1; };
    var medInt = med(ok.filter(function (s) { return !s.ext; }).map(function (s) { return s.sharp; })), medExt = med(ok.filter(function (s) { return s.ext; }).map(function (s) { return s.sharp; }));
    var nInt = ok.filter(function (s) { return !s.ext; }).length, nExt = ok.length - nInt;
    var refSharp = function (s) { return s.ext ? medExt : medInt; }, enough = function (s) { return (s.ext ? nExt : nInt) >= 3; };
    var isoHi = [], apOff = [];
    var ded = { level: 0, sharp: 0, blown: 0, crushed: 0, brk: 0, set: 0, dupe: 0, cov: 0 };
    var dupes = [];
    scenes.forEach(function (s, idx) {
      s.n = idx + 1; s.f = []; var b = s.base.meta;
      s.name = s.base.file.name.replace(/\.[^.]+$/, "");
      if (s.err) { s.f.push("Couldn't read this scene's preview."); return; }
      var v = s.vert;
      if (v.n >= 2 && Math.abs(v.roll) > (s.ext ? T.roll * 1.4 : T.roll)) { s.f.push("Camera not level: tilted " + Math.abs(v.roll).toFixed(1) + "° to the " + (v.roll > 0 ? "right" : "left") + ". Use the level gauge."); ded.level += 0.2; }
      if (v.n >= 4 && Math.abs(v.key) > (s.ext ? T.keystone * 1.5 : T.keystone)) { s.f.push("Verticals lean: camera pointed " + (v.key < 0 ? "up" : "down") + " (~" + Math.abs(v.key).toFixed(1) + "° at the edges). Keep the camera flat and change the height instead."); ded.level += 0.2; }
      if (enough(s) && s.sharp < refSharp(s) * T.sharpRel) { s.f.push("Soft / blurry compared with the rest of the job. Check focus and that nothing bumped the tripod."); ded.sharp += 0.35; }
      var dt = s.darkTone || s.tone;
      if (s.frames.length > 1 && dt.hi > (s.ext ? T.blownExt : T.blown)) { s.f.push("Darkest frame still has blown whites (" + dt.hi.toFixed(1) + "% pure white). Windows won't pull. Add a darker frame."); ded.blown += 0.15; }
      var bt = s.brightTone || s.tone;
      if (s.frames.length > 1 && !s.ext && bt.lo > T.crushed) { s.f.push("Brightest frame still has black shadows (" + bt.lo.toFixed(1) + "%). Add a brighter frame."); ded.crushed += 0.1; }
      if (s.frames.length === 1 && mode > 1) { s.f.push("Not bracketed (1 frame)."); ded.brk += 0.3; }
      else if (s.frames.length !== mode) { s.f.push(s.frames.length + " frames, rest of job is " + mode + ". Keep the bracket set the same."); ded.brk += 0.15; }
      if (s.frames.length > 2 && s.spread && s.spread < T.evSpread) { s.f.push("Brackets only cover " + s.spread.toFixed(1) + " stops. Spread them wider (2 stops apart)."); ded.brk += 0.1; }
      if (b.iso > T.isoMax) isoHi.push(b.iso);
      if (b.fn && (b.fn < T.fLo || b.fn > T.fHi)) apOff.push(b.fn);
      if (!s.ext && b.foc35 && b.foc35 < T.focLo) { s.f.push("Very wide (" + Math.round(b.foc35) + "mm full-frame). Room will stretch. Use 16mm or tighter."); ded.set += 0.1; }
      for (var j = 0; j < idx; j++) { var o = scenes[j]; if (!o.err && o.hash && s.hash && ham(o.hash, s.hash) <= T.dupe) { dupes.push([o, s]); s.f.push("Same angle as scene " + o.n + " (" + o.name + "). Move the tripod for a new angle."); ded.dupe += 0.15; break; } }
    });
    var jobNotes = [];
    if (isoHi.length) { jobNotes.push("ISO " + Math.max.apply(null, isoHi) + " on " + isoHi.length + " of " + scenes.length + " scenes. Set ISO 100-200 manually (turn Auto ISO off); you're on a tripod."); ded.set += 0.4; }
    if (apOff.length) { jobNotes.push("Aperture f/" + apOff[0].toFixed(1) + " on " + apOff.length + " scenes. Use around f/8."); ded.set += 0.3; }
    var need = (window.COVERAGE || {})[pkg.value] || 0, real = scenes.length - dupes.length;
    if (need && real < need) ded.cov = Math.min(2.5, (need - real) * 0.12);
    var cap = { level: 2.5, sharp: 1.5, blown: 1.5, crushed: 0.8, brk: 1.2, set: 0.8, dupe: 1, cov: 2.5 }, tot = 0;
    Object.keys(ded).forEach(function (k) { tot += Math.min(cap[k], ded[k]); });
    var score = Math.max(1, Math.round((10 - tot) * 2) / 2);
    var verdict = score >= 8.5 ? "Great shoot. Upload it." : score >= 7.5 ? "Good. A few things to tighten next time." : score >= 6 ? "Below standard. Read the fixes before your next job." : "Well below standard. Talk to Jason before your next job.";
    var levelBad = scenes.filter(function (s) { return s.f.some(function (x) { return /level|Verticals/.test(x); }); }).length;
    var rolls = ok.filter(function (s) { return s.vert.n >= 2; }).map(function (s) { return Math.abs(s.vert.roll); });
    var avgRoll = rolls.length ? rolls.reduce(function (a, b) { return a + b; }, 0) / rolls.length : 0;
    var ints = ok.filter(function (s) { return !s.ext; }).length, exts = ok.length - ints;
    var flagged = scenes.filter(function (s) { return s.f.length; });
    var cls = score >= 8 ? "s-hi" : score >= 7.5 ? "s-mid" : "s-lo";
    var job = $("scJob").value.trim() || "Untitled job", name = who.value || "Photographer";
    var cam = (scenes[0] && scenes[0].base.meta.model) || "";

    var checks = ["Lights on (premium: off) and all globes working", "Blinds open evenly, TVs off, toilet lids down", "Checked mirrors and glass for me / the tripod", "Wide hero shot of every main room from the corner", "Second angle of living, kitchen, meals and master", "Front straight-on + 3/4, rear, alfresco, pool", "Cars, bins, hoses out of the front shots", "Followed the booking notes", "File count checked after upload, before wiping card"];
    var h = '<div class="scr"><div class="scr-head"><span class="job">' + esc(job) + '</span><span class="score ' + cls + '">' + score + '/10</span></div>' +
      '<div class="meta">' + esc(name) + ' · ' + esc(pkg.value) + (cam ? ' · ' + esc(cam) : '') + ' · ' + new Date().toLocaleDateString("en-AU") + '</div>' +
      '<p class="vd">' + esc(verdict) + '</p><div class="scr-stats">' +
      '<div><b>' + scenes.length + '</b><span>scenes (' + ints + ' int / ' + exts + ' ext)</span></div>' +
      '<div><b>' + (need ? real + '/' + need : real) + '</b><span>unique angles vs minimum</span></div>' +
      '<div><b>' + mode + '</b><span>frames per bracket</span></div>' +
      '<div><b>' + levelBad + '</b><span>scenes not level / straight</span></div>' +
      '<div><b>' + avgRoll.toFixed(1) + '°</b><span>average tilt</span></div>' +
      '<div><b>' + dupes.length + '</b><span>repeat angles</span></div></div>';
    if (jobNotes.length) h += '<h4>Camera settings</h4><ul>' + jobNotes.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join("") + '</ul>';
    if (need && real < need) h += '<h4>Coverage</h4><ul><li>Only ' + real + ' unique scenes for a ' + esc(pkg.value.toLowerCase()) + ' job (minimum ' + need + '). Missing rooms or second angles.</li></ul>';
    if (flagged.length) {
      h += '<h4>Fix next time (' + flagged.length + ' scenes)</h4><div class="scr-grid">' + flagged.map(function (s) {
        return '<div>' + (s.thumb ? '<img src="' + s.thumb + '" alt="">' : '') + '<p class="meta">Scene ' + s.n + ' · ' + esc(s.name) + ' · ' + s.frames.length + ' fr</p><ul>' + s.f.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join("") + '</ul></div>';
      }).join("") + '</div>';
    } else h += '<h4>No problems found in the files.</h4>';
    h += '<h4>Can\'t be measured, tick it off yourself</h4><div class="chk">' + checks.map(function (c, i) { return '<label><input type="checkbox" data-i="' + i + '"> ' + esc(c) + '</label>'; }).join("") + '</div>';
    h += '<p class="meta" style="margin-top:12px">Camera height, room choice and styling still need Jason\'s eye.' + (info.skipped ? ' ' + info.skipped + ' drone files skipped.' : '') + (info.noMeta ? ' ' + info.noMeta + ' files couldn\'t be read.' : '') + '</p>';
    h += '<details class="scr-all"><summary>All scenes</summary><table><tr><th>#</th><th>First file</th><th>Frames</th><th>Stops</th><th>Tilt°</th><th>Lean°</th><th>Sharp</th><th>Dark-frame white %</th><th>ISO</th><th>f/</th><th>mm (FF)</th></tr>' +
      scenes.map(function (s) { var m = s.base.meta, v = s.vert || {};
        return '<tr' + (s.f.length ? ' class="flag"' : '') + '><td>' + s.n + '</td><td>' + esc(s.frames[0].file.name) + '</td><td>' + s.frames.length + '</td><td>' + (s.spread ? s.spread.toFixed(1) : '–') + '</td><td>' + (v.n >= 2 ? v.roll.toFixed(1) : '–') + '</td><td>' + (v.n >= 4 ? v.key.toFixed(1) : '–') + '</td><td>' + (s.sharp ? Math.round(s.sharp / refSharp(s) * 100) + '%' : '–') + '</td><td>' + (s.darkTone ? s.darkTone.hi.toFixed(1) : '–') + '</td><td>' + (m.iso || '–') + '</td><td>' + (m.fn ? m.fn.toFixed(1) : '–') + '</td><td>' + (m.foc35 ? Math.round(m.foc35) : '–') + '</td></tr>'; }).join("") + '</table></details>';
    h += '<div class="scr-btns"><button type="button" id="scCopy">Copy report</button><button type="button" id="scPdf">Save as PDF</button></div></div>';
    out.innerHTML = h;

    var txt = function () {
      var t = ["SHOOT SELF-CHECK: " + job, name + " · " + pkg.value + " · " + new Date().toLocaleDateString("en-AU"), "Score " + score + "/10 · " + verdict, "",
        scenes.length + " scenes (" + ints + " int / " + exts + " ext), " + real + " unique" + (need ? " vs " + need + " minimum" : "") + ", " + mode + " frames per bracket, " + levelBad + " not level/straight, " + dupes.length + " repeat angles", ""];
      jobNotes.forEach(function (x) { t.push("Settings: " + x); }); if (need && real < need) t.push("Coverage: only " + real + " unique scenes (minimum " + need + ")");
      flagged.forEach(function (s) { t.push("Scene " + s.n + " (" + s.name + "):"); s.f.forEach(function (x) { t.push("  - " + x); }); });
      var ticked = [].slice.call(out.querySelectorAll(".chk input")).map(function (c, i) { return (c.checked ? "[x] " : "[ ] ") + checks[i]; });
      t.push("", "Checklist:"); return t.concat(ticked).join("\n");
    };
    $("scCopy").onclick = function () { var b = this, s = txt(); (navigator.clipboard ? navigator.clipboard.writeText(s) : Promise.reject()).then(function () { b.textContent = "Copied"; setTimeout(function () { b.textContent = "Copy report"; }, 1600); }, function () { prompt("Copy this:", s); }); };
    $("scPdf").onclick = function () { document.body.classList.add("printing"); window.print(); setTimeout(function () { document.body.classList.remove("printing"); }, 500); };
  }
})();
