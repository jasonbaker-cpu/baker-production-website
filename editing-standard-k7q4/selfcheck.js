/* Baker Production self-check: runs entirely in the browser. Photos are never uploaded.
   Same measurements as Baker's internal QC: wall white, warm cast (R-B on walls),
   brightness, shadows, clipped highlights, sky saturation, near-duplicates, sizes. */
(function () {
  var VER = "v11 · 9 Nov 2026"; /* bump on every rule change */
  /* STRICT 9.5 standard (6 Nov 2026): every photo must be inside the targets. One miss = not ready. */
  /* 7 Nov 2026 "best in Perth": Mathews Group brightness, soft pale skies (11 Nov), Crib Creative contrast + held highlights, greens at both. */
  var B = { wallLo: 207, wallHi: 224, castLo: 1, castHi: 9, lLo: 155, lHi: 194, clip: 0.8, skySat: 0.32, skyPale: 0.05, extDark: 118, extShadow: 34, greenSat: 0.40, extHot: 235,
    extCast: 10, flatP5: 75, flatRng: 150,
    setWallLo: 209, setWallHi: 219, setCastLo: 2, setCastHi: 7, setLLo: 165, setLHi: 186, setSd: 5, setFlat: 70 };
  var $ = function (id) { return document.getElementById(id); };
  var drop = $("scDrop"), input = $("scInput"), out = $("scOut"), jobEl = $("scJob");
  if (!drop) return;
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]; }); };

  ["dragenter", "dragover"].forEach(function (e) { drop.addEventListener(e, function (ev) { ev.preventDefault(); drop.classList.add("over"); }); });
  ["dragleave", "drop"].forEach(function (e) { drop.addEventListener(e, function (ev) { ev.preventDefault(); drop.classList.remove("over"); }); });
  drop.addEventListener("drop", function (ev) { run(ev.dataTransfer.files); });
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

  function analyse(file) {
    return loadImg(file).then(function (o) {
      var im = o.im, W = im.naturalWidth, H = im.naturalHeight;
      var w = 800, h = Math.max(1, Math.round(800 * H / W));
      var c = document.createElement("canvas"); c.width = w; c.height = h;
      var x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(im, 0, 0, w, h);
      var d = x.getImageData(0, 0, w, h).data, n = w * h;
      var hist = new Uint32Array(256), sumL = 0, clip = 0, ch = [new Float32Array(512), new Float32Array(512)];
      for (var i = 0; i < d.length; i += 4) { var L = (d[i] + d[i + 1] + d[i + 2]) / 3; hist[L | 0]++; sumL += L; if (L >= 252) clip++;
        ch[(i / 4 / w) < h / 2 ? 0 : 1][(d[i] >> 5) * 64 + (d[i + 1] >> 5) * 8 + (d[i + 2] >> 5)]++; }
      var half = n / 2; for (var cb = 0; cb < 512; cb++) { ch[0][cb] /= half; ch[1][cb] /= half; }
      var pct = function (p) { var t = n * p, a = 0; for (var k = 0; k < 256; k++) { a += hist[k]; if (a >= t) return k; } return 255; };
      var p55 = pct(0.55), p5 = pct(0.05), p95 = pct(0.95);
      var wr = 0, wg = 0, wb = 0, wc = 0, topBlue = 0, skyS = 0, topN = 0, topRows = Math.floor(h / 3), top5 = Math.floor(h / 5), warmSky = 0, top5N = 0, green = 0, greenS = 0, ceil = 0, skyL = 0;
      for (var y = 0; y < h; y++) for (var xx = 0; xx < w; xx++) {
        var j = (y * w + xx) * 4, r = d[j], g = d[j + 1], b = d[j + 2], LL = (r + g + b) / 3, mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = (mx - mn) / (mx + 1);
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
      var thumb = t.toDataURL("image/jpeg", 0.7); URL.revokeObjectURL(o.url);
      return { name: file.name, W: W, H: H, kind: isExt ? "EXT" : "INT", dusk: dusk, L: sumL / n, wallW: (wall[0] + wall[1] + wall[2]) / 3,
               cast: wall[0] - wall[2], p5: p5, rng: p95 - p5, p95: p95, greenF: greenF, greenSat: green ? greenS / green : 0, clip: clip / n * 100, skySat: topBlue ? skyS / topBlue : 0, blueFrac: blueFrac, hash: hash, ch: ch, lay: lay, thumb: thumb };
    });
  }

  var EYE = ["No halos or bright edges around trees, roofs or poles against the sky (sky replacement / over-sharpening).",
    "No pink/green/purple colour fringing in window views or on roofs and gutters.",
    "Window views clean and natural: no grey or glowing pulls, no ghosting.",
    "Verticals dead straight on every photo (walls, door frames, cabinets).",
    "Sky on every exterior: soft pale blue fading to near-white at the horizon, light wispy clouds, never deep or saturated blue. Edges masked cleanly, no cut-off hills or trees.",
    "Grass green and even, no burnt or patchy lawn left in.",
    "No AI artefacts: warped lines, smeared textures, melted objects.",
    "Only one photo per angle: drop near-duplicates and older versions of redone files.",
    "Every photo same size and crop, sharp, no noise in shadows.",
    "Dusk/twilight shots: natural sunset sky (soft pink, peach or golden is fine, no dark fake purple), every window and light glowing, lawn green, tight framing."];
  function flags(r) {
    var f = [];
    if (r.kind === "INT") {
      if (r.wallW < 202 || (r.wallW < B.wallLo && r.L < 168)) f.push({ k: "dim", t: "Walls grey/dim (" + r.wallW.toFixed(0) + ", target ~215). Brighten." });
      if (r.wallW > B.wallHi) f.push({ k: "hot", t: "Walls too white (" + r.wallW.toFixed(0) + ", target ~215). Pull back." });
      if (r.cast < B.castLo) f.push({ k: "cold", t: "Walls cold/grey (warmth " + r.cast.toFixed(1) + ", target +2 to +7). Warm slightly." });
      if (r.cast > B.castHi) f.push({ k: "cream", t: "Walls too cream/yellow (warmth +" + r.cast.toFixed(1) + ", target +2 to +7). Neutralise: clean white like Mathews Group." });
      if (r.L < B.lLo && r.wallW < 214) f.push({ k: "dark", t: "Room too dark (brightness " + r.L.toFixed(0) + ", target 165-185)." }); /* dark floors/joinery with good walls are fine */
      if (r.L > B.lHi) f.push({ k: "bright", t: "Room too bright/washed out (brightness " + r.L.toFixed(0) + ", target 165-185)." });
    } else {
      if (!r.dusk && r.skySat > B.skySat) f.push({ k: "sky", t: "Sky too deep/saturated blue (" + r.skySat.toFixed(2) + ", target 0.15-0.30). Soft pale blue, near-white at the horizon, no dark gradient at the top." });
      if (!r.dusk && r.blueFrac > 0.15 && r.skySat < B.skyPale) f.push({ k: "pale", t: "Sky is grey/white with no blue (" + r.skySat.toFixed(2) + ", target 0.15-0.30). Add a soft pale blue sky." });
      if (!r.dusk && r.L > 182) f.push({ k: "washed", t: "Exterior very washed out (brightness " + r.L.toFixed(0) + ", target 135-180). Bright and airy is good. Only pull highlights back if the house and greens lose colour; do not darken midtones." });
      if (r.L < (r.dusk ? 100 : B.extDark)) f.push({ k: "dark", t: "Exterior too dark (brightness " + r.L.toFixed(0) + ", min " + B.extDark + "). Lift the whole frame." });
      if (!r.dusk && r.greenF > 0.04 && r.greenSat < B.greenSat) f.push({ k: "greens", t: "Greens dull (" + r.greenSat.toFixed(2) + ", target 0.45+). Add vibrance to lawn, trees and hedges." });
      if (!r.dusk && r.p95 > B.extHot) f.push({ k: "hot", t: "Bright areas too hot (" + r.p95 + ", target 230 or less). Pull highlights back on ground, paths and walls." });
      if (!r.dusk && r.p5 < B.extShadow) f.push({ k: "shadow", t: "Shadows too dark (darkest areas " + r.p5 + ", target 40+). Lift shadows under carports, patios and trees." });
      if (r.p5 > B.flatP5 && r.rng < B.flatRng) f.push({ k: "flat", t: "Flat/hazy, no contrast (blacks lifted to " + r.p5 + ", tonal range " + r.rng + "). Add contrast and set a true black point." });
      /* beige paving/brick reads warm in Perth sun; only flag orange when the sky is pushed off-blue too */
      if (!r.dusk && r.cast > B.extCast) f.push({ k: "orange", t: "Yellow/orange cast on the exterior (warmth +" + r.cast.toFixed(1) + ", target 0 to +6 like Crib Creative). Neutralise the white balance: this is what makes exteriors look dull." });
    }
    if (r.clip > B.clip) f.push({ k: "clip", t: "Blown highlights (" + r.clip.toFixed(1) + "% clipped). Recover windows/whites." });
    return f;
  }

  function run(files) {
    files = Array.prototype.filter.call(files, function (f) { return /^image\/(jpeg|png|webp)$/.test(f.type) || /\.(jpe?g|png|webp)$/i.test(f.name); });
    if (!files.length) return;
    files.sort(function (a, b) { return a.name.localeCompare(b.name, undefined, { numeric: true }); });
    out.innerHTML = '<p class="meta">Checking ' + files.length + ' photos… (stays on your computer)</p>';
    var res = [], i = 0;
    (function next() {
      if (i >= files.length) return report(res);
      out.innerHTML = '<p class="meta">Checking ' + (i + 1) + ' of ' + files.length + ': ' + esc(files[i].name) + '</p>';
      analyse(files[i]).then(function (r) { res.push(r); }, function () { }).then(function () { i++; setTimeout(next, 0); });
    })();
  }

  function report(rs) {
    rs.forEach(function (r) { r.f = flags(r); });
    var ints = rs.filter(function (r) { return r.kind === "INT"; });
    var avg = function (a, k) { return a.length ? a.reduce(function (s, r) { return s + r[k]; }, 0) / a.length : 0; };
    var aw = avg(ints, "wallW"), ac = avg(ints, "cast"), al = avg(ints, "L");
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
      if (aw < B.setWallLo && al < 175) setIssues.push("Whole set too grey/dim: average walls " + aw.toFixed(0) + " (target ~215).");
      if (aw > B.setWallHi) setIssues.push("Whole set too white/bright: average walls " + aw.toFixed(0) + " (target ~215).");
      if (ac < B.setCastLo) setIssues.push("Whole set too cold/grey: average warmth " + ac.toFixed(1) + " (target +2 to +7).");
      if (ac > B.setCastHi) setIssues.push("Whole set too cream: average warmth +" + ac.toFixed(1) + " (target +2 to +7).");
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
      '<div class="scr-stats"><div><b>' + aw.toFixed(0) + '</b><span>Walls (target ~215)</span></div><div><b>' + (ac >= 0 ? "+" : "") + ac.toFixed(1) + '</b><span>Warmth (+2 to +7)</span></div><div><b>' + al.toFixed(0) + '</b><span>Brightness (165-185)</span></div><div><b>' + flagged.length + '</b><span>Photos flagged</span></div><div><b>' + dupes.length + '</b><span>Possible duplicates</span></div></div>';
    if (setIssues.length) html += '<h4>Whole-set issues</h4><ul>' + setIssues.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ul>";
    if (dupes.length) html += '<h4>Possible duplicates (check, then remove one)</h4><ul>' + dupes.map(function (p) { return "<li>" + esc(p[0]) + " ≈ " + esc(p[1]) + "</li>"; }).join("") + "</ul>";
    html += '<h4>Photos to fix</h4>' + (flagged.length ? '<div class="scr-grid">' + flagged.map(function (r) {
      return '<div class="note"><img src="' + r.thumb + '" alt=""><p><span class="tag bad">Fix</span> <span class="meta">' + esc(r.name) + ' · ' + r.kind + '</span></p><ul>' + r.f.map(function (x) { return "<li>" + esc(x.t) + "</li>"; }).join("") + '</ul></div>';
    }).join("") + "</div>" : '<p>None. Every photo is inside the targets.</p>');
    html += '<h4>Eye checks (zoom to 100% on every photo; tools can\'t catch these)</h4><ul class="scr-eye">' + EYE.map(function (e) { return "<li>☐ " + esc(e) + "</li>"; }).join("") + "</ul>";
    html += '<details class="scr-all"><summary>All photo numbers</summary><table><thead><tr><th>File</th><th>Type</th><th>Walls</th><th>Warmth</th><th>Brightness</th><th>Clipped</th><th>Size</th></tr></thead><tbody>' +
      rs.map(function (r) { return "<tr" + (r.f.length ? ' class="flag"' : "") + "><td>" + esc(r.name) + "</td><td>" + r.kind + "</td><td>" + r.wallW.toFixed(0) + "</td><td>" + r.cast.toFixed(1) + "</td><td>" + r.L.toFixed(0) + "</td><td>" + r.clip.toFixed(1) + "%</td><td>" + r.W + "×" + r.H + "</td></tr>"; }).join("") + "</tbody></table></details>" +
      '<p class="meta" style="margin-top:12px">Strict check: one flagged photo means not ready. Covered patios can read as "interior" and painted feature walls can trip the colour checks; if a flag is genuinely wrong, say so in your hand-back note. Baker checks every job by eye.</p>' +
      '<div class="scr-btns"><button type="button" id="scCopy">Copy report text</button><button type="button" id="scPrint">Print / save PDF</button></div></div>';
    out.innerHTML = html;

    var txt = "BAKER SELF-CHECK " + VER + ": " + job + "\n" + when + " · " + rs.length + " photos\nScore (est.): " + score + "/10, " + verdict +
      "\nWalls " + aw.toFixed(0) + " (target ~215) · Warmth " + ac.toFixed(1) + " (+2 to +7) · Brightness " + al.toFixed(0) + " (165-185)\n" +
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
