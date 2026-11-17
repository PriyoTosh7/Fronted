/* Progressive enhancement: scroll reveals only; no cursor-following effects. */
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let observer;

  function setup() {
    let preference = true;
    try { preference = JSON.parse(localStorage.getItem('cc-motion') ?? 'true') !== false; }
    catch { /* Storage may be blocked. */ }

    const enabled = preference && !reduce.matches;
    root.dataset.motion = enabled ? 'on' : 'off';
    document.querySelector('[data-action="motion"]')?.setAttribute('aria-pressed', String(enabled));
    observer?.disconnect();

    const targets = document.querySelectorAll('#main .section, #main .stat');
    if (!enabled || !('IntersectionObserver' in window)) {
      document.querySelectorAll('.motion-reveal').forEach(el => el.classList.add('is-visible'));
      return;
    }

    observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }), { threshold: .06, rootMargin: '0px 0px -10px 0px' });

    targets.forEach(el => {
      el.classList.add('motion-reveal');
      el.classList.remove('is-visible');
      observer.observe(el);
    });
  }

  document.addEventListener('cropcare:render', setup);
  document.addEventListener('cropcare:motion', setup);
  reduce.addEventListener('change', setup);
  setup();
})();
