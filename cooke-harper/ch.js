/* Cooke & Harper — shared data and behaviour. */
(function () {
  'use strict';

  /* Sales: Jayden Cooke & James Harper, Rodway Group.
     Source: RateMyAgent and REIWA sold records, checked 30 Oct 2026.
     [date (yyyy-mm-dd), address, suburb, price (0 = not disclosed), beds, baths, cars, type] */
  var SALES = [
    ['2026-09-08', '60D Croyden Road', 'Roleystone', 1260000, 4, 2, 4, 'House'],
    ['2026-08-30', '107 Dundatha Drive', 'Byford', 810000, 4, 2, 4, 'House'],
    ['2026-08-28', '6 Incana Court', 'Kelmscott', 800000, 4, 2, 3, 'House'],
    ['2026-08-27', '4 Blantyre Way', 'Kelmscott', 750000, 3, 1, 5, 'House'],
    ['2026-07-18', '4 Fortunella Grove', 'Seville Grove', 775000, 4, 1, 3, 'House'],
    ['2026-06-25', '18B Tredale Avenue', 'Mount Richon', 710000, 3, 1, 3, 'House'],
    ['2026-06-23', '16A Werndley Street', 'Armadale', 760000, 4, 2, 2, 'House'],
    ['2026-06-04', '12 Peavey Road', 'Whitby', 845000, 4, 2, 5, 'House'],
    ['2026-04-25', '33 Onyx Road', 'Mount Richon', 1019000, 4, 2, 2, 'House'],
    ['2026-04-21', '1A Derry Avenue', 'Mount Nasura', 800000, 3, 1, 0, 'House'],
    ['2026-04-16', '19 Wangoola Terrace', 'Mount Nasura', 337000, 0, 0, 0, 'Land'],
    ['2026-04-09', '15 Alola Street', 'Kelmscott', 830000, 3, 1, 1, 'House'],
    ['2026-04-06', '54 Henrietta Avenue', 'Mount Nasura', 1290000, 5, 3, 2, 'House'],
    ['2026-03-25', '7 Kurrajong Street', 'Roleystone', 865000, 3, 1, 2, 'House'],
    ['2026-03-17', '10/36 Keehner Entrance', 'Martin', 0, 3, 2, 2, 'House'],
    ['2026-03-04', '55 Connell Avenue', 'Kelmscott', 0, 4, 2, 1, 'House'],
    ['2026-03-03', '1 Ardross Street', 'Seville Grove', 0, 3, 2, 2, 'House'],
    ['2026-02-27', '32 Connell Avenue', 'Kelmscott', 0, 5, 3, 2, 'House'],
    ['2026-02-27', '3/32 Salter Road', 'Mount Nasura', 0, 3, 2, 2, 'House'],
    ['2026-02-19', '13 Magazine Link', 'Byford', 0, 4, 2, 2, 'House'],
    ['2026-02-19', '61 Setosa Loop', 'Byford', 0, 4, 2, 2, 'House'],
    ['2026-02-19', '57 Park Road', 'Kenwick', 0, 4, 2, 4, 'House'],
    ['2026-02-17', '7 Woodville Road', 'Haynes', 0, 4, 2, 2, 'House'],
    ['2026-02-10', '79 Derry Avenue', 'Mount Nasura', 1150000, 4, 2, 4, 'House'],
    ['2026-02-05', '47 Bromfield Drive', 'Kelmscott', 0, 4, 2, 2, 'House'],
    ['2026-02-03', '1 Burndale Road', 'Mount Richon', 0, 4, 2, 2, 'House'],
    ['2026-01-28', '67 Gunnison Loop', 'Haynes', 900000, 4, 2, 0, 'House'],
    ['2026-01-28', '7 Padra Turn', 'Byford', 0, 4, 2, 2, 'House'],
    ['2026-01-12', '153 Clifton Street', 'Kelmscott', 1275000, 5, 5, 2, 'House'],
    ['2025-12-12', '17 Parkway Gardens', 'Parmelia', 0, 3, 1, 2, 'House'],
    ['2025-11-27', '12 Harrison Road', 'Mount Richon', 0, 3, 2, 2, 'House'],
    ['2025-11-27', '238 Brookton Highway', 'Kelmscott', 0, 4, 2, 3, 'House'],
    ['2025-11-27', '69 Doley Road', 'Byford', 0, 3, 2, 2, 'House'],
    ['2025-11-17', '48 Scott Road', 'Kelmscott', 1400000, 3, 1, 4, 'House'],
    ['2025-11-17', '5 Smailes Elbow', 'Brookdale', 0, 4, 2, 2, 'House'],
    ['2025-11-10', '92 Doorigo Road', 'Armadale', 630000, 3, 1, 1, 'House']
  ];
  window.CH_SALES = SALES;

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function price(n) { return n ? '$' + n.toLocaleString('en-AU') : ''; }
  function month(d) { return MONTHS[Number(d.slice(5, 7)) - 1] + ' ' + d.slice(0, 4); }
  function card(s, feature) {
    var spec = s[7] === 'Land' ? 'Land' : [s[4] + ' bed', s[5] + ' bath', s[6] ? s[6] + ' car' : ''].filter(Boolean).join(' · ');
    return '<article class="sale' + (feature ? ' feature' : '') + '">' +
      '<span class="tag">Sold ' + month(s[0]) + '</span>' +
      '<h3>' + esc(s[1]) + '</h3><span class="sub">' + esc(s[2]) + '</span>' +
      (s[3] ? '<span class="price num">' + price(s[3]) + '</span>' : '<span class="price na">Price not disclosed</span>') +
      '<div class="meta"><span>' + spec + '</span></div></article>';
  }

  /* Render a sales grid into any element with data-sales="N" (latest N with a price) or data-sales="all" (filterable). */
  document.querySelectorAll('[data-sales]').forEach(function (el) {
    var mode = el.getAttribute('data-sales');
    if (mode !== 'all') {
      var n = parseInt(mode, 10) || 6;
      el.innerHTML = SALES.filter(function (s) { return s[3]; }).slice(0, n).map(function (s, i) { return card(s, i === 0); }).join('');
      return;
    }
    var bar = document.getElementById('filters');
    var counts = {};
    SALES.forEach(function (s) { counts[s[2]] = (counts[s[2]] || 0) + 1; });
    var subs = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a] || a.localeCompare(b); });
    var current = 'All';
    function draw() {
      var list = SALES.filter(function (s) { return current === 'All' || s[2] === current; });
      el.innerHTML = list.map(function (s, i) { return card(s, current === 'All' && i === 0); }).join('');
      if (bar) bar.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-sub') === current)); });
      var c = document.getElementById('salesCount');
      if (c) c.textContent = list.length + (list.length === 1 ? ' sale' : ' sales') + (current === 'All' ? '' : ' in ' + current);
    }
    if (bar) {
      bar.innerHTML = ['All'].concat(subs).map(function (s) {
        return '<button type="button" data-sub="' + esc(s) + '">' + esc(s) + (s === 'All' ? '' : ' <span class="num">' + counts[s] + '</span>') + '</button>';
      }).join('');
      bar.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; current = b.getAttribute('data-sub'); draw(); });
    }
    draw();
  });

  /* Lead forms: posts to FormSubmit, which emails Jayden with James copied. */
  var TO = 'jaydencooke@rodwaygroup.com.au';
  var CC = 'jamesharper@rodwaygroup.com.au';
  var src = 'website';
  try { src = new URLSearchParams(location.search).get('src') || 'website'; } catch (e) {}

  document.querySelectorAll('form.lead').forEach(function (form) {
    var kind = form.getAttribute('data-kind');
    var status = form.querySelector('.status');
    var btn = form.querySelector('button[type=submit]');
    var btnText = btn ? btn.textContent : '';
    function fail(msg) { if (status) { status.textContent = msg; status.hidden = false; } }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (status) status.hidden = true;
      var hp = form.querySelector('.hp input');
      if (hp && hp.value) return;
      var d = {};
      new FormData(form).forEach(function (v, k) { d[k] = typeof v === 'string' ? v.trim() : v; });
      var missing = [];
      form.querySelectorAll('[data-req]').forEach(function (f) { if (!String(d[f.name] || '').trim()) missing.push(f.getAttribute('data-req')); });
      if (d.phone && d.phone.replace(/\D/g, '').length < 8) missing.push('a full mobile number');
      if (missing.length) { fail('Please add ' + missing.join(', ') + '.'); return; }
      var payload = { _cc: CC, _template: 'table', _captcha: 'false', Source: src, Page: location.pathname };
      if (kind === 'appraisal') {
        payload._subject = 'New appraisal request: ' + d.address + ', ' + d.suburb + ' (' + (d.timeframe || 'timing not given') + ')';
        payload.Name = d.name; payload.Mobile = d.phone; payload.Email = d.email || '-';
        payload.Property = d.address + ', ' + d.suburb; payload.Bedrooms = d.bedrooms || '-';
        payload['Selling timeframe'] = d.timeframe || '-';
      } else {
        payload._subject = 'New buyer for the list: ' + d.name + ' (' + (d.budget || 'budget not given') + ')';
        payload.Name = d.name; payload.Mobile = d.phone; payload.Email = d.email || '-';
        payload.Budget = d.budget || '-'; payload.Bedrooms = d.bedrooms || '-';
        payload.Suburbs = d.suburbs || '-'; payload.Finance = d.finance || '-';
        payload['Buying timeframe'] = d.timeframe || '-'; payload['Must haves'] = d.wants || '-';
      }
      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
      fetch('https://formsubmit.co/ajax/' + TO, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (res) {
          if (res && String(res.success) === 'false') throw new Error('rejected');
          var wrap = form.closest('[data-form-wrap]');
          var done = wrap && wrap.querySelector('.done');
          if (done) {
            var nm = done.querySelector('[data-first]'); if (nm) nm.textContent = (d.name || '').split(' ')[0] || 'there';
            var ad = done.querySelector('[data-addr]'); if (ad) ad.textContent = d.address ? d.address + ', ' + d.suburb : 'your home';
            form.hidden = true; done.hidden = false;
            var h = wrap.querySelector('.form-head'); if (h) h.hidden = true;
            done.setAttribute('tabindex', '-1'); done.focus();
          }
        })
        .catch(function () {
          if (btn) { btn.disabled = false; btn.textContent = btnText; }
          fail('That didn’t send. Please call Jayden on 0433 565 670, or try again in a minute.');
        });
    });
  });

  var y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear();
})();
