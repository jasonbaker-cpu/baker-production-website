/* Baker Production self-check: runs entirely in the browser. Photos are never uploaded.
   Same measurements as Baker's internal QC: wall white, warm cast (R-B on walls),
   brightness, shadows, clipped highlights, sky saturation, near-duplicates, sizes. */
(function () {
  /* 9.5 standard (6 Nov 2026): Crib / Thorburn level on every photo. */
  var B = { wallLo: 205, wallHi: 219, castLo: 2.5, castHi: 9, lLo: 162, lHi: 198, clip: 1.5, skySat: 0.32, extDark: 110, extShadow: 16,
    setWallLo: 207, setWallHi: 216, setCastLo: 3, setCastHi: 8, setLLo: 166, setLHi: 188, setSd: 6 };
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
      var hist = new Uint32Array(256), sumL = 0, clip = 0;
      for (var i = 0; i < d.length; i += 4) { var L = (d[i] + d[i + 1] + d[i + 2]) / 3; hist[L | 0]++; sumL += L; if (L >= 252) clip++; }
      var pct = function (p) { var t = n * p, a = 0; for (var k = 0; k < 256; k++) { a += hist[k]; if (a >= t) return k; } return 255; };
      var p55 = pct(0.55), p5 = pct(0.05);
      var wr = 0, wg = 0, wb = 0, wc = 0, topBlue = 0, skyS = 0, topN = 0, topRows = Math.floor(h / 3), top5 = Math.floor(h / 5), warmSky = 0, top5N = 0, green = 0, ceil = 0;
      for (var y = 0; y < h; y++) for (var xx = 0; xx < w; xx++) {
        var j = (y * w + xx) * 4, r = d[j], g = d[j + 1], b = d[j + 2], LL = (r + g + b) / 3, mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = (mx - mn) / (mx + 1);
        if (LL > p55 && LL < 250 && sat < 0.1) { wr += r; wg += g; wb += b; wc++; }
        if (y < topRows) { topN++; if (b > r + 15 && b > 120) { topBlue++; skyS += sat; } if (LL > 175 && sat < 0.07) ceil++; }
        if (y < top5) { top5N++; if (LL > 140 && r > b + 12 && sat > 0.08 && sat < 0.55) warmSky++; }
        if (g > r + 8 && g > b + 8 && sat > 0.18) green++;
      }
      var wall = wc ? [wr / wc, wg / wc, wb / wc] : [0, 0, 0];
      var blueFrac = topBlue / topN, ceilF = ceil / topN, warmF = warmSky / Math.max(1, top5N), greenF = green / n;
      /* Exterior = blue sky, or sunset/dusk sky + garden, or lots of garden. Interiors have a white ceiling in the top third. */
      var isExt = (blueFrac > 0.15 && ceilF < 0.5) || greenF > 0.15 || (greenF > 0.03 && (ceilF < 0.12 || (ceilF < 0.45 && warmF > 0.08)));
      var dusk = isExt && warmF > 0.08 && blueFrac < 0.3;
      var s = document.createElement("canvas"); s.width = 9; s.height = 8; var sx = s.getContext("2d"); sx.drawImage(im, 0, 0, 9, 8);
      var sd = sx.getImageData(0, 0, 9, 8).data, gray = [];
      for (var q = 0; q < sd.length; q += 4) gray.push(0.299 * sd[q] + 0.587 * sd[q + 1] + 0.114 * sd[q + 2]);
      var hash = []; for (var ry = 0; ry < 8; ry++) for (var rx = 0; rx < 8; rx++) hash.push(gray[ry * 9 + rx + 1] > gray[ry * 9 + rx] ? 1 : 0);
      var t = document.createElement("canvas"); t.width = 320; t.height = Math.round(320 * H / W); t.getContext("2d").drawImage(im, 0, 0, t.width, t.height);
      var thumb = t.toDataURL("image/jpeg", 0.7); URL.revokeObjectURL(o.url);
      return { name: file.name, W: W, H: H, kind: isExt ? "EXT" : "INT", dusk: dusk, L: sumL / n, wallW: (wall[0] + wall[1] + wall[2]) / 3,
               cast: wall[0] - wall[2], p5: p5, clip: clip / n * 100, skySat: topBlue ? skyS / topBlue : 0, hash: hash, thumb: thumb };
    });
  }

  function flags(r) {
    var f = [];
    if (r.kind === "INT") {
      if (r.wallW < B.wallLo) f.push({ k: "dim", t: "Walls grey/dim (" + r.wallW.toFixed(0) + ", target ~212). Brighten." });
      if (r.wallW > B.wallHi) f.push({ k: "hot", t: "Walls too white (" + r.wallW.toFixed(0) + ", target ~212). Pull back." });
      if (r.cast < B.castLo) f.push({ k: "cold", t: "Walls cold/grey (warmth " + r.cast.toFixed(1) + ", target +3 to +7). Warm slightly." });
      if (r.cast > B.castHi) f.push({ k: "cream", t: "Walls too cream/yellow (warmth +" + r.cast.toFixed(1) + ", target +3 to +7). Neutralise." });
      if (r.L < B.lLo) f.push({ k: "dark", t: "Room too dark (brightness " + r.L.toFixed(0) + ", target 168-186)." });
      if (r.L > B.lHi) f.push({ k: "bright", t: "Room too bright/washed out (brightness " + r.L.toFixed(0) + ", target 168-186)." });
    } else {
      if (r.skySat > B.skySat) f.push({ k: "sky", t: "Sky too deep blue (" + r.skySat.toFixed(2) + ", target ~0.27). Use soft pale blue." });
      if (r.L < (r.dusk ? 95 : B.extDark)) f.push({ k: "dark", t: "Exterior too dark (brightness " + r.L.toFixed(0) + "). Lift the whole frame." });
      if (r.p5 < (r.dusk ? 10 : B.extShadow)) f.push({ k: "shadow", t: "Heavy black shadows (darkest areas " + r.p5 + "). Lift shadows under trees/patios." });
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
    for (var a = 0; a < rs.length; a++) for (var b = a + 1; b < rs.length; b++) {
      var dd = 0; for (var k = 0; k < 64; k++) if (rs[a].hash[k] !== rs[b].hash[k]) dd++;
      if (dd <= 6) dupes.push([rs[a].name, rs[b].name, dd]);
    }
    var sizes = {}; rs.forEach(function (r) { var key = r.W + "x" + r.H; sizes[key] = (sizes[key] || 0) + 1; });
    var widths = {}; rs.forEach(function (r) { widths[r.W] = 1; });
    var setIssues = [];
    if (ints.length) {
      if (aw < B.setWallLo) setIssues.push("Whole set too grey/dim: average walls " + aw.toFixed(0) + " (target ~212).");
      if (aw > B.setWallHi) setIssues.push("Whole set too white/bright: average walls " + aw.toFixed(0) + " (target ~212).");
      if (ac < B.setCastLo) setIssues.push("Whole set too cold/grey: average warmth " + ac.toFixed(1) + " (target +3 to +7).");
      if (ac > B.setCastHi) setIssues.push("Whole set too cream: average warmth +" + ac.toFixed(1) + " (target +3 to +7).");
      if (al < B.setLLo) setIssues.push("Whole set too dark: average brightness " + al.toFixed(0) + " (target 168-186).");
      if (al > B.setLHi) setIssues.push("Whole set too bright: average brightness " + al.toFixed(0) + " (target 168-186).");
      if (sd > B.setSd) setIssues.push("Photos don't match each other (wall brightness varies ±" + sd.toFixed(0) + "). Even out the set.");
    }
    if (Object.keys(widths).length > 1) setIssues.push("Mixed resolutions: " + Object.keys(sizes).join(", ") + ". Export all at the same size.");
    var flagged = rs.filter(function (r) { return r.f.length; });
    var score = 10 - setIssues.length * 0.6 - Math.min(2, flagged.length / Math.max(1, rs.length) * 4) - Math.min(1.5, dupes.length * 0.3);
    score = Math.max(4, Math.round(score * 2) / 2);
    var verdict = score >= 9.5 ? "Ready to deliver (Baker 9.5 standard)" : score >= 8.5 ? "Not ready yet: fix the flagged photos first" : score >= 7 ? "Needs work before delivery" : "Redo the set";
    var cls = score >= 9.5 ? "s-hi" : score >= 8.5 ? "s-mid" : "s-lo";
    var job = (jobEl.value || "").trim() || "Untitled job";
    var when = new Date().toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" });

    var html = '<div class="scr" id="scReport"><div class="scr-head"><div><div class="job">' + esc(job) + '</div><div class="meta">Self-check · ' + esc(when) + ' · ' + rs.length + ' photos (' + ints.length + ' interior, ' + (rs.length - ints.length) + ' exterior)</div></div><span class="score ' + cls + '">' + score + '/10 est.</span></div>' +
      '<p class="vd"><b>' + verdict + '.</b></p>' +
      '<div class="scr-stats"><div><b>' + aw.toFixed(0) + '</b><span>Walls (target ~212)</span></div><div><b>' + (ac >= 0 ? "+" : "") + ac.toFixed(1) + '</b><span>Warmth (+3 to +7)</span></div><div><b>' + al.toFixed(0) + '</b><span>Brightness (168-186)</span></div><div><b>' + flagged.length + '</b><span>Photos flagged</span></div><div><b>' + dupes.length + '</b><span>Possible duplicates</span></div></div>';
    if (setIssues.length) html += '<h4>Whole-set issues</h4><ul>' + setIssues.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ul>";
    if (dupes.length) html += '<h4>Possible duplicates (check, then remove one)</h4><ul>' + dupes.map(function (p) { return "<li>" + esc(p[0]) + " ≈ " + esc(p[1]) + "</li>"; }).join("") + "</ul>";
    html += '<h4>Photos to fix</h4>' + (flagged.length ? '<div class="scr-grid">' + flagged.map(function (r) {
      return '<div class="note"><img src="' + r.thumb + '" alt=""><p><span class="tag bad">Fix</span> <span class="meta">' + esc(r.name) + ' · ' + r.kind + '</span></p><ul>' + r.f.map(function (x) { return "<li>" + esc(x.t) + "</li>"; }).join("") + '</ul></div>';
    }).join("") + "</div>" : '<p>None. Every photo is inside the targets.</p>');
    html += '<details class="scr-all"><summary>All photo numbers</summary><table><thead><tr><th>File</th><th>Type</th><th>Walls</th><th>Warmth</th><th>Brightness</th><th>Clipped</th><th>Size</th></tr></thead><tbody>' +
      rs.map(function (r) { return "<tr" + (r.f.length ? ' class="flag"' : "") + "><td>" + esc(r.name) + "</td><td>" + r.kind + "</td><td>" + r.wallW.toFixed(0) + "</td><td>" + r.cast.toFixed(1) + "</td><td>" + r.L.toFixed(0) + "</td><td>" + r.clip.toFixed(1) + "%</td><td>" + r.W + "×" + r.H + "</td></tr>"; }).join("") + "</tbody></table></details>" +
      '<p class="meta" style="margin-top:12px">Estimate only. Covered patios can read as "interior", and painted feature walls (cream, grey) can trip the colour checks. Baker does a final check by eye.</p>' +
      '<div class="scr-btns"><button type="button" id="scCopy">Copy report text</button><button type="button" id="scPrint">Print / save PDF</button></div></div>';
    out.innerHTML = html;

    var txt = "BAKER SELF-CHECK: " + job + "\n" + when + " · " + rs.length + " photos\nScore (est.): " + score + "/10, " + verdict +
      "\nWalls " + aw.toFixed(0) + " (target ~212) · Warmth " + ac.toFixed(1) + " (+3 to +7) · Brightness " + al.toFixed(0) + " (168-186)\n" +
      (setIssues.length ? "\nWHOLE SET:\n- " + setIssues.join("\n- ") + "\n" : "") +
      (dupes.length ? "\nPOSSIBLE DUPLICATES:\n- " + dupes.map(function (p) { return p[0] + " ≈ " + p[1]; }).join("\n- ") + "\n" : "") +
      "\nPHOTOS TO FIX:\n" + (flagged.length ? flagged.map(function (r) { return "- " + r.name + ": " + r.f.map(function (x) { return x.t; }).join(" "); }).join("\n") : "- None");
    $("scCopy").onclick = function () {
      var btn = this;
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { btn.textContent = "Copied ✓"; }, function () {
        var ta = document.createElement("textarea"); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); btn.textContent = "Copied ✓"; } catch (e) { } ta.remove();
      });
    };
    $("scPrint").onclick = function () { document.body.classList.add("printing"); window.print(); setTimeout(function () { document.body.classList.remove("printing"); }, 500); };
  }
})();
