/* Baker Production — sticky mobile booking bar.
   Phones only. Appears once the visitor scrolls past the first screen, hides near the footer
   and while the mobile menu is open. Self-contained: injects its own CSS and markup. */
(function () {
  if (window.__bakerCtaBar) return; window.__bakerCtaBar = true;
  var TEL = 'tel:+61466789522';
  var BOOK = 'https://portal.bakerproduction.com/book';

  var css = '' +
    '.bp-cta{position:fixed;left:0;right:0;bottom:0;z-index:900;display:none;gap:10px;padding:10px 14px calc(10px + env(safe-area-inset-bottom));' +
    'background:rgba(14,14,14,.94);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border-top:1px solid rgba(255,255,255,.08);' +
    'transform:translateY(110%);transition:transform .35s cubic-bezier(.2,.8,.2,1)}' +
    '.bp-cta.on{transform:none}' +
    '.bp-cta a{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;height:46px;font:600 12px/1 var(--font-body,Inter,system-ui,sans-serif);' +
    'letter-spacing:2px;text-transform:uppercase;text-decoration:none;border-radius:0}' +
    '.bp-cta .bp-call{flex:0 0 38%;color:#fff;border:1px solid rgba(255,255,255,.35)}' +
    '.bp-cta .bp-book{color:#111;background:var(--color-accent,#b8975a)}' +
    '.bp-cta svg{width:15px;height:15px;flex:none}' +
    '@media (max-width:760px){.bp-cta{display:flex}body.bp-cta-pad{padding-bottom:calc(66px + env(safe-area-inset-bottom))}}' +
    '@media (prefers-reduced-motion:reduce){.bp-cta{transition:none}}' +
    '@media print{.bp-cta{display:none!important}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var bar = document.createElement('div');
  bar.className = 'bp-cta'; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Book or call Baker Production');
  bar.innerHTML =
    '<a class="bp-call" href="' + TEL + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>Call</a>' +
    '<a class="bp-book" href="' + BOOK + '">Book Now</a>';
  document.body.appendChild(bar);
  document.body.classList.add('bp-cta-pad');

  var footer = document.querySelector('footer, .footer');
  var menu = document.getElementById('mobileMenu');
  var ticking = false;
  function update() {
    ticking = false;
    var y = window.pageYOffset || document.documentElement.scrollTop;
    var past = y > window.innerHeight * 0.6;
    var nearFoot = footer ? footer.getBoundingClientRect().top < window.innerHeight - 40 : false;
    var menuOpen = menu && menu.classList.contains('open');
    var show = past && !nearFoot && !menuOpen;
    bar.classList.toggle('on', show);
    bar.setAttribute('aria-hidden', show ? 'false' : 'true');
    [].forEach.call(bar.querySelectorAll('a'), function (a) { a.tabIndex = show ? 0 : -1; });
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  if (menu && 'MutationObserver' in window) new MutationObserver(onScroll).observe(menu, { attributes: true, attributeFilter: ['class'] });
  update();
})();
