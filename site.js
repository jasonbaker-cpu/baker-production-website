/* Baker Production — shared behaviour for service & location pages.
   Null-safe: every hook is optional. */
(function () {
  'use strict';

  var navbar = document.getElementById('navbar');
  if (navbar) {
    var onScroll = function () { navbar.classList.toggle('scrolled', window.pageYOffset > 80); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  var hamburger = document.getElementById('hamburger');
  var mobileMenu = document.getElementById('mobileMenu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', function () {
      var opening = !mobileMenu.classList.contains('open');
      hamburger.classList.toggle('open', opening);
      mobileMenu.classList.toggle('open', opening);
      if (navbar) navbar.classList.toggle('menu-open', opening);
      mobileMenu.classList.toggle('light', opening && navbar && navbar.classList.contains('scrolled'));
      document.body.style.overflow = opening ? 'hidden' : '';
      hamburger.setAttribute('aria-expanded', String(opening));
    });
  }
  window.closeMenu = function () {
    if (hamburger) { hamburger.classList.remove('open'); hamburger.setAttribute('aria-expanded', 'false'); }
    if (mobileMenu) mobileMenu.classList.remove('open', 'light');
    if (navbar) navbar.classList.remove('menu-open');
    document.body.style.overflow = '';
  };

  if ('IntersectionObserver' in window) {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('revealed'); ro.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });
    document.querySelectorAll('.reveal').forEach(function (el) { ro.observe(el); });
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('revealed'); });
  }

  document.addEventListener('click', function (e) {
    var q = e.target.closest && e.target.closest('.lp-faq-q');
    if (!q) return;
    var item = q.parentElement;
    var a = item.querySelector('.lp-faq-a');
    var open = item.classList.contains('open');
    item.classList.toggle('open', !open);
    q.setAttribute('aria-expanded', String(!open));
    if (a) a.style.maxHeight = open ? null : a.scrollHeight + 'px';
  });
})();
