(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  // Mobile menu
  const header = $('.nav'), burger = $('.burger');
  const setMenu = open => {
    header.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open);
  };
  burger.addEventListener('click', () => setMenu(!header.classList.contains('open')));
  $$('#menu a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => e.key === 'Escape' && setMenu(false));

  // Placeholder "#" links should not jump to the top
  $$('a[href="#"]').forEach(a => a.addEventListener('click', e => e.preventDefault()));

  // Scroll progress bar + active nav link
  const bar = $('.progress');
  const links = $$('#menu a');
  const sections = links.map(a => $(a.getAttribute('href')));
  const onScroll = () => {
    const h = document.documentElement;
    bar.style.transform = `scaleX(${h.scrollTop / ((h.scrollHeight - h.clientHeight) || 1)})`;
    const y = scrollY + 140;
    let current = -1;
    sections.forEach((s, i) => { if (s && s.offsetTop <= y) current = i; });
    links.forEach((a, i) => a.classList.toggle('active', i === current));
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Scroll reveal
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: 0.12 });
  $$('.reveal').forEach(el => io.observe(el));

  // Mouse tracking (skipped for reduced motion and touch devices)
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !matchMedia('(hover: hover)').matches) return;

  const hero = $('.hero'), glow = $('.glow'), orbs = $$('.orb');
  let tx = hero.clientWidth * 0.6, ty = hero.clientHeight * 0.4, x = tx, y = ty;
  hero.addEventListener('pointermove', e => {
    const r = hero.getBoundingClientRect();
    tx = e.clientX - r.left; ty = e.clientY - r.top;
  });
  const tick = () => {
    x += (tx - x) * 0.08; y += (ty - y) * 0.08;
    glow.style.transform = `translate(${x - 260}px, ${y - 260}px)`;
    const nx = x / hero.clientWidth - 0.5, ny = y / hero.clientHeight - 0.5;
    orbs.forEach(o => { const d = +o.dataset.depth; o.style.translate = `${nx * d}px ${ny * d}px`; });
    requestAnimationFrame(tick);
  };
  tick();

  // Project card spotlight follows the cursor
  $$('.card').forEach(c => c.addEventListener('pointermove', e => {
    const r = c.getBoundingClientRect();
    c.style.setProperty('--x', e.clientX - r.left + 'px');
    c.style.setProperty('--y', e.clientY - r.top + 'px');
  }));
})();
