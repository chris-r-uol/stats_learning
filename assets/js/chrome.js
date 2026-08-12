/* Shared page furniture: theme toggle and the site-wide language preference.
   Loaded on every page; degrades to nothing if the elements are absent. */

(function () {
  'use strict';

  function mountThemeToggle() {
    const slot = document.querySelector('[data-theme-toggle]');
    if (!slot) return;
    const order = ['auto', 'light', 'dark'];
    const label = { auto: 'Theme: auto', light: 'Theme: light', dark: 'Theme: dark' };
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn quiet small';
    const paint = () => { btn.textContent = label[Progress.theme()] || label.auto; };
    btn.addEventListener('click', () => {
      const i = order.indexOf(Progress.theme());
      Progress.setTheme(order[(i + 1) % order.length]);
      paint();
    });
    paint();
    slot.appendChild(btn);
  }

  // A student who works in R should see R everywhere, not have to click a tab
  // on every single step.
  function mountLangPicker() {
    const slot = document.querySelector('[data-lang-picker]');
    if (!slot) return;
    const sel = document.createElement('select');
    sel.setAttribute('aria-label', 'Preferred tool for worked solutions');
    [['excel', 'Excel'], ['r', 'R'], ['python', 'Python']].forEach(([v, t]) => {
      const o = document.createElement('option');
      o.value = v; o.textContent = t;
      sel.appendChild(o);
    });
    sel.value = Progress.lang();
    sel.addEventListener('change', () => {
      if (window.Engine) window.Engine.setLang(sel.value);
      else Progress.setLang(sel.value);
    });
    slot.appendChild(sel);
  }

  function markCurrentNav() {
    const here = location.pathname.split('/').pop() || 'index.html';
    const q = new URLSearchParams(location.search).get('t');
    document.querySelectorAll('.masthead nav a').forEach(a => {
      const href = a.getAttribute('href') || '';
      const [path, query] = href.split('?');
      const file = path.split('/').pop() || 'index.html';
      if (file !== here) return;
      if (query && q && !query.includes('t=' + q)) return;
      a.setAttribute('aria-current', 'page');
    });
  }

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else fn();
  }

  ready(() => {
    mountThemeToggle();
    mountLangPicker();
    markCurrentNav();
  });
})();
