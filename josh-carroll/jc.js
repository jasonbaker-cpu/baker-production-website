/* Josh Carroll · Heathridge pages. Lead capture, reel tracking, mobile bar. */
(function () {
  'use strict';
  var KEY = 'AIzaSyC0ES1GZsgtl4_vC6Dpp-4aG-Iy4DtXlCE';
  var BASE = 'https://firestore.googleapis.com/v1/projects/baker-leads/databases/(default)/documents/bb/josh-carroll/';
  /* No email alert yet: leads land in Josh's app inbox. Add his email here to also get an alert. */
  var MAIL = '';
  var PHONE = '0409234500';

  /* Which reel or link brought them here. Kept for the whole visit so the register page knows too. */
  var src = '';
  try {
    var q = new URLSearchParams(location.search).get('src');
    if (q) { src = q.slice(0, 60); sessionStorage.setItem('jc_src', src); }
    else src = sessionStorage.getItem('jc_src') || '';
  } catch (e) {}
  var source = src || 'direct';

  function fsFields(o) { var f = {}; Object.keys(o).forEach(function (k) { if (o[k]) f[k] = { stringValue: String(o[k]).slice(0, k === 'source' ? 60 : k === 'createdAt' ? 40 : 500) }; }); return { fields: f }; }
  function post(coll, o) { return fetch(BASE + coll + '?key=' + KEY, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fsFields(o)), keepalive: true }); }

  /* One visit per page per session, tagged with the reel code. Feeds the reel tracker in Josh's app. */
  try {
    var page = /register/.test(location.pathname) ? 'register' : 'valuation';
    var vk = 'jc_v_' + page;
    if (!sessionStorage.getItem(vk)) {
      sessionStorage.setItem(vk, '1');
      post('visits', { c: source, page: page, at: new Date().toISOString(), ref: (document.referrer || '').replace(/^https?:\/\//, '').split('/')[0] }).catch(function () {});
    }
  } catch (e) {}

  /* Mobile action bar */
  (function () {
    var form = document.querySelector('[data-form-wrap]');
    var reg = /register/.test(location.pathname);
    var bar = document.createElement('div');
    bar.className = 'mbar';
    bar.innerHTML = '<a class="btn btn-ghost" href="tel:' + PHONE + '">Call Josh</a>' +
      '<a class="btn btn-sand" href="#form">' + (reg ? 'Join the register' : 'Private valuation') + '</a>';
    document.body.appendChild(bar);
    document.body.classList.add('has-mbar');
    if (form && 'IntersectionObserver' in window) new IntersectionObserver(function (es) { bar.classList.toggle('off', es[0].isIntersecting); }, { threshold: 0.12 }).observe(form);
  })();

  /* Forms */
  document.querySelectorAll('form.lead').forEach(function (form) {
    var kind = form.getAttribute('data-kind');
    var status = form.querySelector('.status');
    var btn = form.querySelector('button[type=submit]');
    var label = btn ? btn.textContent : '';
    function fail(m) { status.textContent = m; status.hidden = false; }
    function v(n) {
      var els = form.querySelectorAll('[name="' + n + '"]');
      if (!els.length) return '';
      if (els[0].type === 'checkbox' && els.length > 1) return [].filter.call(els, function (e) { return e.checked; }).map(function (e) { return e.value; }).join(', ');
      if (els[0].type === 'checkbox') return els[0].checked ? 'yes' : 'no';
      if (els[0].type === 'radio') { var c = [].filter.call(els, function (e) { return e.checked; })[0]; return c ? c.value : ''; }
      return String(els[0].value || '').trim();
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault(); status.hidden = true;
      if (v('_honey')) return;
      var miss = [];
      form.querySelectorAll('[data-req]').forEach(function (f) { if (!v(f.name)) miss.push(f.getAttribute('data-req')); });
      if (v('phone') && v('phone').replace(/\D/g, '').length < 8) miss.push('a full mobile number');
      if (miss.length) { fail('Please add ' + miss.join(', ') + '.'); return; }
      var d = { kind: kind, source: source, createdAt: new Date().toISOString(), name: v('name'), phone: v('phone'), email: v('email') };
      var mail = { _subject: '', _template: 'table', _captcha: 'false', Source: source, Name: d.name, Mobile: d.phone, Email: d.email || '-' };
      if (kind === 'valuation') {
        d.address = v('address'); d.suburb = v('suburb'); d.propertyType = v('propertyType'); d.views = v('views'); d.timeframe = v('timeframe'); d.offMarket = v('offMarket');
        mail._subject = 'Private valuation request: ' + d.address + ', ' + d.suburb;
        mail.Property = d.address + ', ' + d.suburb; mail['Home type'] = d.propertyType || '-'; mail.Views = d.views || '-'; mail.Timing = d.timeframe || '-'; mail['Off-market'] = d.offMarket;
      } else {
        d.budget = v('budget'); d.suburbs = v('suburbs'); d.propertyType = v('propertyType'); d.bedrooms = v('bedrooms'); d.wants = v('wants'); d.timeframe = v('timeframe'); d.finance = v('finance');
        mail._subject = 'New private register buyer: ' + d.name + ' (' + (d.budget || 'budget not given') + ')';
        mail.Budget = d.budget || '-'; mail.Suburbs = d.suburbs || '-'; mail['Home type'] = d.propertyType || '-'; mail.Bedrooms = d.bedrooms || '-'; mail['Must haves'] = d.wants || '-'; mail.Timing = d.timeframe || '-'; mail.Finance = d.finance || '-';
      }
      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
      var a = post('inbox', d).then(function (r) { if (!r.ok) throw new Error(r.status); });
      var b = !MAIL ? Promise.reject(new Error('no mail')) : fetch(MAIL, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(mail) }).then(function (r) { if (!r.ok) throw new Error(r.status); });
      Promise.allSettled([a, b]).then(function (res) {
        if (res[0].status === 'rejected' && (!MAIL || res[1].status === 'rejected')) {
          if (btn) { btn.disabled = false; btn.textContent = label; }
          fail('That didn’t send. Please call Josh on 0409 234 500, or try again in a minute.');
          return;
        }
        var wrap = form.closest('[data-form-wrap]'), done = wrap.querySelector('.done');
        var n = done.querySelector('[data-first]'); if (n) n.textContent = (d.name || '').split(/\s+/)[0] || 'there';
        var ad = done.querySelector('[data-addr]'); if (ad) ad.textContent = d.address ? d.address + ', ' + d.suburb : 'your home';
        form.hidden = true; var h = wrap.querySelector('.form-head'); if (h) h.hidden = true;
        done.hidden = false; done.setAttribute('tabindex', '-1'); done.focus();
      });
    });
  });

  var y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear();
})();
