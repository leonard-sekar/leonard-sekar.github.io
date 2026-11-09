(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = matchMedia('(hover: hover)').matches;

  /* Theme toggle */
  const themeToggle = $('#themeToggle');
  const themeValue = $('.theme-value', themeToggle);
  if (themeToggle && themeValue) {
    const setTheme = (theme, persist = true) => {
      document.documentElement.dataset.theme = theme;
      const isLight = theme === 'light';
      themeToggle.setAttribute('aria-pressed', String(isLight));
      themeToggle.setAttribute('aria-label', `Switch to ${isLight ? 'dark' : 'light'} mode`);
      themeValue.textContent = isLight ? 'LIGHT' : 'DARK';
      if (persist) {
        try {
          localStorage.setItem('portfolio-theme', theme);
        } catch {
          /* The selected mode still works for this page view if storage is unavailable. */
        }
      }
    };
    setTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark', false);
    themeToggle.addEventListener('click', () => {
      setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
    });
  }

  /* Mobile menu */
  const header = $('.nav'), burger = $('.burger');
  const setMenu = open => {
    header.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open);
  };
  burger.addEventListener('click', () => setMenu(!header.classList.contains('open')));
  $$('#menu a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => e.key === 'Escape' && setMenu(false));

  /* Placeholder "#" links should not jump to the top */
  $$('a[href="#"]').forEach(a => a.addEventListener('click', e => e.preventDefault()));

  /* Scroll progress bar + active nav link */
  const bar = $('.progress');
  const hero = $('#home');
  const asciiFigure = $('#asciiFigure');
  const asciiObject = $('#asciiObject');
  const asciiCanvas = $('#asciiPortrait');
  const faceSource = $('#faceSource');
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

  /* Convert the face reference into animated ASCII glyphs on a lightweight,
     fully responsive, pointer-interactive 3D stage. */
  if (hero && asciiFigure && asciiObject && asciiCanvas && faceSource) {
    const context = asciiCanvas.getContext('2d');
    const sampleCanvas = document.createElement('canvas');
    const sampleContext = sampleCanvas.getContext('2d', { willReadFrequently: true });
    if (context && sampleContext) {
      const reduced = reduceMotion;
      const RIPPLE_LIFE = 1100;
      let smoothProgress = 0;
      let lastRender = 0, lastWidth = 0, lastHeight = 0;
      let columns = 0, rows = 0, faceSize = 0, faceLeft = 0, faceTop = 0;
      let samplePixels = null;
      let animationFrame = 0;
      let heroVisible = true;
      /* Local (canvas-space) pointer position, used to light up glyphs near the cursor;
         null means "no pointer on the stage right now". */
      let pointerLocalX = null, pointerLocalY = null, targetLocalX = null, targetLocalY = null;
      let ripples = [];
      const codeGlyphs = '01{}[]<>/\\|=+-_*#$%&:;~';
      const faceMap = [
        '000000000000000000000000000000000000000000000000000000000000000000000000',
        '000000000000000000000000000000000000000000000000000000000000000000000000',
        '000000000000000000000000000000000000000000000000000000000000000000000000',
        '000000000000000000000000000000000000000000000000000000000000000000000000',
        '000000000000000000000000000000000000000000000000000000000000000000000000',
        '000000000000000000000000000000000000000000000200000000000000000000000000',
        '000000000000000000000000000000000000052240100000000000000000000000000000',
        '000000000000000000000000000000001100111460000000003010000000000000000000',
        '000000000000000000000000000006101225666665120000000000000000000000000000',
        '000000000000000000000000000005656566666666642000000000000000000000000000',
        '000000000000000000060000000636665566666666614200000000000000000000000000',
        '000000000000000000000000000066666006666666652330000000000000000000000000',
        '000000000000000000410000000205601330256666666666000064000000000000000000',
        '000000000000000000000000000060650012006556666666660050000000000000000000',
        '000000000000000000036165605010555016551666666666660010000000000000000000',
        '000000000000000000000000000103666665126666666666630000000400000000000000',
        '000000000000000000000036610000000066630466666666661000000005246000000000',
        '000000066660000000220000004066622325331225365666425043200300000000000000',
        '000000000000000002160000000010206665660000310355266000000000000000000000',
        '000000000000032420066000300000001600000000000666466150000000000000000000',
        '000000000000000000154000000002200001000000000266020130000066400000000000',
        '000000000044556020451000060000661520000300000004366010000000000000000000',
        '000000052524056260000000000015665133240406200266630600000000000000000000',
        '000000000000000000000000000000020000423266102666605000000000000000000000',
        '000000000011451320000000404463656006003064366466666660060000000000000000',
        '000000010000000000000000100065000300543566666463046623000000000000000000',
        '000000060000000000010032311000000002212566266056216660005000000000000000',
        '000000000000000000000000000000200000250266560001402666551200000000000000',
        '000000000001636600000000001000000000130266640600103145100600030000000000',
        '000000000002004033501514600000006000420166600665000000010060030000000000',
        '000000000000000001000000006100000003542266621502000000430000000000000000',
        '000000000000000525320000000000000524653456662500000030565000000000000000',
        '000000000000000200000456000010004602004666654600000004666000000000000000',
        '000000000000636004400466421606520045044666666666002266666000000000000000',
        '000000024563200130213036662120050405551066656666666666666600000000000000',
        '000000000000000503100000000506530010640366666646666666666400000000000000',
        '000000000000553520130400005000000100000422622234200411662000000000000000',
        '000000000000300000044000000000000000000005431120000121312000000000000000',
        '000000000000000012645600000000000000000000020024001364000000000000000000',
        '000000034401000000000000000000000000200012000000105666562000000000000000',
        '000000000000000000600000000020000002200012000616650454664000000000000000',
        '000000000000002212000001000003110002310421112366300110656000000000000000',
        '000000000066120000000026636236600030060156120666654666666000000000000000',
        '000000000000000000000000000046411011020120560666666666666000000000000000',
        '000000000000000300224414000005330062040140266455666666666000000000000000',
        '000000000000000000000000000000000010000010344204200666666000000000000000',
        '000000000015532014556000005000000010012001000301000565366000000000000000',
        '000000000000000000000000000000000000001000000102100362062000000000000000',
        '000000000000000000000000000000000000000000000000000000000000000000000000',
        '000000000000064665566456105600000000000000000000000010000000000000000000',
        '000000000000000045010666000666550600000000000000000010000000000000000000',
        '000000000000000000000012200316000000000000000000000452000000000000000000',
        '000000000000000000000000000001002500000020000000001340000000000000000000',
        '000000000000000000000001000000000000000020000000034300000000000000000000',
        '000000000000000000000002000000000000000000006310366200000000000000000000',
        '000000000000000000000000000000000000000000005100214000000000000000000000',
        '000000000000000006556001520013000000000350056050006000000000000000000000',
        '000000000000000000000000000000000000000010004026066000000000000000000000',
        '000000000000000000000000000000000000000000100650141600000000000000000000',
        '000000000000000000000000000000000000000000000220100000000000000000000000',
        '000000000000000000000000000000000000000000000000000000000000000000000000',
        '000000000000000000000000000000000000000000000000011100000000000000000000',
        '000000000000000000000000000000024455101011000014030200000000000000000000',
        '000000000000000000000000000000000000000006000240060000000000000000000000',
        '000000000000000000000000000000000000000002300310050500000000000000000000',
        '000000000000000000000000000000000000000000300310061500000000000000000000',
        '000000000000000000000000000000000000000000000000000000000000000000000000',
        '000000000000000000000000000000000000000000000000000000000000000000000000',
        '000000000000000000000000000000000000000000000000000000000000000000000000',
        '000000000000000000000000000000000000000000000000000000000000000000000000',
        '000000000000000000000000000000000000000000000000000000000000000000000000',
        '000000000000000000000000000000000000000000000000000000000000000000000000',
      ].join('');
      const monoFont = getComputedStyle(document.documentElement).getPropertyValue('--mono').trim();

      /* Column count scales continuously with the stage's own width instead of
         jumping between two fixed breakpoints, so the grid density adapts to
         any viewport — phone, foldable, tablet, ultrawide — not just "mobile vs not". */
      const computeColumns = width => {
        const w = width || asciiObject.clientWidth || innerWidth;
        return Math.max(34, Math.min(92, Math.round(w / 13)));
      };

      const resizeCanvas = () => {
        const bounds = {
          width: asciiObject.clientWidth,
          height: asciiObject.clientHeight,
        };
        if (!bounds.width || !bounds.height) return;
        const dpr = Math.min(devicePixelRatio || 1, innerWidth <= 600 ? 1 : 1.5);
        asciiCanvas.width = Math.max(1, Math.round(bounds.width * dpr));
        asciiCanvas.height = Math.max(1, Math.round(bounds.height * dpr));
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        lastWidth = bounds.width;
        lastHeight = bounds.height;
        columns = computeColumns(bounds.width);
        rows = columns;
        faceSize = Math.min(lastWidth * (innerWidth <= 600 ? .94 : .8), lastHeight * .92);
        faceLeft = (lastWidth - faceSize) / 2;
        faceTop = (lastHeight - faceSize) / 2;
        sampleCanvas.width = columns;
        sampleCanvas.height = rows;
        if (location.protocol !== 'file:' && faceSource.naturalWidth) {
          sampleContext.clearRect(0, 0, columns, rows);
          sampleContext.drawImage(faceSource, 0, 0, columns, rows);
          samplePixels = sampleContext.getImageData(0, 0, columns, rows).data;
        }
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.font = `500 ${Math.max(7, faceSize / columns * .86)}px ${monoFont}`;
      };

      const renderFace = now => {
        context.clearRect(0, 0, lastWidth, lastHeight);
        const frame = Math.floor(now / (innerWidth <= 600 ? 220 : 160));
        const lightTheme = document.documentElement.dataset.theme === 'light';
        const cyanRGB = lightTheme ? '8,126,155' : '110,231,255';
        context.font = `500 ${Math.max(7, faceSize / columns * .86)}px ${monoFont}`;

        const hasPointer = pointerLocalX !== null;
        const glowRadius = faceSize * .22;
        const activeRipples = ripples.filter(r => now - r.t0 < RIPPLE_LIFE);
        const rippleSpeed = Math.hypot(lastWidth, lastHeight) / RIPPLE_LIFE;
        const ringWidth = Math.max(10, faceSize * .07);

        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < columns; col++) {
            const cellX = faceLeft + (col + .5) * faceSize / columns;
            const cellY = faceTop + (row + .5) * faceSize / rows;

            /* Interactive boost: how "lit" this cell is from cursor proximity
               and any still-travelling click ripples, 0 (none) to 1 (peak). */
            let boost = 0;
            if (hasPointer) {
              const dist = Math.hypot(cellX - pointerLocalX, cellY - pointerLocalY);
              if (dist < glowRadius) boost = 1 - dist / glowRadius;
            }
            for (let i = 0; i < activeRipples.length; i++) {
              const age = now - activeRipples[i].t0;
              const ringRadius = age * rippleSpeed;
              const ringDist = Math.abs(Math.hypot(cellX - activeRipples[i].x, cellY - activeRipples[i].y) - ringRadius);
              if (ringDist < ringWidth) {
                const strength = (1 - ringDist / ringWidth) * (1 - age / RIPPLE_LIFE);
                if (strength > boost) boost = strength;
              }
            }

            let level = 0;
            let faceHit = true;
            if (samplePixels) {
              const pixel = (row * columns + col) * 4;
              const luminance = samplePixels[pixel] * .2126
                + samplePixels[pixel + 1] * .7152
                + samplePixels[pixel + 2] * .0722;
              if (luminance < 18) faceHit = false;
              else level = Math.min(5, Math.floor(luminance / 256 * 6));
            } else {
              const mapRow = Math.floor(row * 72 / rows);
              const mapColumn = Math.floor(col * 72 / columns);
              const mapValue = faceMap[mapRow * 72 + mapColumn].charCodeAt(0) - 48;
              if (mapValue === 0) faceHit = false;
              else level = mapValue - 1;
            }

            /* Skip truly empty, untouched cells — keeps the per-frame cost the
               same as before away from the cursor. Cells the cursor or a
               ripple reaches still draw, even outside the face silhouette,
               so the whole stage reads as one interactive glyph grid. */
            if (!faceHit && boost <= 0.02) continue;

            const stride = 3 + level * 4 + Math.round(boost * 6);
            const glyphIndex = (row * 17 + col * 31 + frame * stride) % codeGlyphs.length;
            const glyph = codeGlyphs[glyphIndex];

            if (faceHit) {
              const brightness = lightTheme
                ? Math.max(14, 58 - level * 6 - boost * 16)
                : Math.min(255, 108 + level * 27 + boost * 50);
              context.fillStyle = `rgb(${brightness},${brightness},${brightness})`;
              context.globalAlpha = Math.min(1, (lightTheme ? .92 : .68) + level * .05 + boost * .3);
            } else {
              context.fillStyle = `rgb(${cyanRGB})`;
              context.globalAlpha = Math.min(.8, boost * .75);
            }
            context.fillText(glyph, cellX, cellY);
          }
        }

        if (hasPointer || activeRipples.length) {
          const cellSize = faceSize / columns;
          const stageColumns = Math.ceil(lastWidth / cellSize);
          const stageRows = Math.ceil(lastHeight / cellSize);
          for (let row = 0; row < stageRows; row++) {
            for (let col = 0; col < stageColumns; col++) {
              const cellX = (col + .5) * cellSize;
              const cellY = (row + .5) * cellSize;
              if (cellX >= faceLeft && cellX < faceLeft + faceSize
                && cellY >= faceTop && cellY < faceTop + faceSize) continue;

              let boost = 0;
              if (hasPointer) {
                const dist = Math.hypot(cellX - pointerLocalX, cellY - pointerLocalY);
                if (dist < glowRadius) boost = 1 - dist / glowRadius;
              }
              for (let i = 0; i < activeRipples.length; i++) {
                const age = now - activeRipples[i].t0;
                const ringRadius = age * rippleSpeed;
                const ringDist = Math.abs(Math.hypot(cellX - activeRipples[i].x, cellY - activeRipples[i].y) - ringRadius);
                if (ringDist < ringWidth) {
                  const strength = (1 - ringDist / ringWidth) * (1 - age / RIPPLE_LIFE);
                  if (strength > boost) boost = strength;
                }
              }
              if (boost <= 0.02) continue;

              const glyph = codeGlyphs[(row * 17 + col * 31 + frame) % codeGlyphs.length];
              context.fillStyle = `rgb(${cyanRGB})`;
              context.globalAlpha = Math.min(.8, boost * .75);
              context.fillText(glyph, cellX, cellY);
            }
          }
        }
        context.globalAlpha = 1;
      };

      const animateFace = now => {
        animationFrame = 0;
        if (document.hidden || !heroVisible) return;
        const targetProgress = reduced ? 0 : Math.max(0, Math.min(1, (scrollY - hero.offsetTop) / (hero.offsetHeight * .9)));
        smoothProgress += (targetProgress - smoothProgress) * .24;
        if (targetLocalX === null) {
          pointerLocalX = null;
          pointerLocalY = null;
        } else {
          pointerLocalX = targetLocalX;
          pointerLocalY = targetLocalY;
        }
        if (ripples.length) ripples = ripples.filter(r => now - r.t0 < RIPPLE_LIFE);
        const progress = smoothProgress;
        const opacity = (innerWidth <= 600 ? .9 : .86) * (1 - progress);
        asciiObject.style.setProperty('--figure-scale', (1 + progress * .18).toFixed(3));
        asciiFigure.style.setProperty('--figure-opacity', opacity.toFixed(3));
        asciiFigure.style.setProperty('--figure-close', `${(progress * 48).toFixed(2)}%`);

        const frameInterval = 33;
        if (!reduced && now - lastRender >= frameInterval) {
          renderFace(now);
          lastRender = now;
        } else if (reduced && !lastRender) {
          renderFace(now);
          lastRender = now;
        }
        if (!reduced) animationFrame = requestAnimationFrame(animateFace);
      };

      const startFace = () => {
        resizeCanvas();
        renderFace(performance.now());
        lastRender = performance.now();
        if (!reduced && !animationFrame) animationFrame = requestAnimationFrame(animateFace);
      };

      /* Responsive: react to the stage's own box (ResizeObserver), not just
         window resize — covers orientation changes, sidebar/layout reflow,
         and font-load reflow alike. Falls back to a resize listener when
         ResizeObserver isn't available. Debounced to one recompute per frame. */
      let resizeScheduled = false;
      const scheduleResize = () => {
        if (resizeScheduled) return;
        resizeScheduled = true;
        requestAnimationFrame(() => {
          resizeScheduled = false;
          resizeCanvas();
          renderFace(performance.now());
        });
      };
      if (typeof ResizeObserver !== 'undefined') {
        new ResizeObserver(scheduleResize).observe(asciiObject);
      } else {
        addEventListener('resize', scheduleResize, { passive: true });
      }
      addEventListener('orientationchange', scheduleResize, { passive: true });

      if (!reduced) {
        hero.addEventListener('pointermove', event => {
          const bounds = hero.getBoundingClientRect();
          targetLocalX = event.clientX - bounds.left;
          targetLocalY = event.clientY - bounds.top;
        }, { passive: true });
        hero.addEventListener('pointerleave', () => {
          targetLocalX = null;
          targetLocalY = null;
        }, { passive: true });
        /* Click (or tap) sends an expanding ring of glyphs across the stage —
           works for touch too, since pointerdown unifies mouse/pen/touch. */
        hero.addEventListener('pointerdown', event => {
          const bounds = hero.getBoundingClientRect();
          ripples.push({
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top,
            t0: performance.now(),
          });
          if (ripples.length > 3) ripples.shift();
        }, { passive: true });
      }

      const heroObserver = new IntersectionObserver(([entry]) => {
        heroVisible = entry.isIntersecting;
        asciiFigure.classList.toggle('is-visible', heroVisible);
        if (!reduced && heroVisible && !document.hidden && !animationFrame) {
          animationFrame = requestAnimationFrame(animateFace);
        } else if (!heroVisible && animationFrame) {
          cancelAnimationFrame(animationFrame);
          animationFrame = 0;
        }
      });
      heroObserver.observe(hero);
      document.addEventListener('visibilitychange', () => {
        if (!reduced && !document.hidden && heroVisible && !animationFrame) {
          animationFrame = requestAnimationFrame(animateFace);
        } else if (document.hidden && animationFrame) {
          cancelAnimationFrame(animationFrame);
          animationFrame = 0;
        }
      });
      if (faceSource.complete && faceSource.naturalWidth) startFace();
      else faceSource.addEventListener('load', startFace, { once: true });
      faceSource.addEventListener('error', () => {
        console.error('Could not load the hero ASCII reference image — falling back to the built-in face map.');
        startFace();
      }, { once: true });
    }
  }

  /* HUD — live clock (updates once a second, independent of the render loop) */
  const clockEl = $('#hudClock');
  if (clockEl) {
    const tick = () => { clockEl.textContent = `${new Date().toLocaleTimeString('en-GB', { hour12: false })} IST`; };
    tick();
    setInterval(tick, 1000);
  }

  /* HUD — pointer coordinate readout (desktop only, throttled to the shared rAF loop below) */
  const coordEl = $('#hudCoord');

  /* AI-assistant terminal state swaps from CONNECTING… to LIVE once the iframe loads */
  const assistantState = $('#assistantState');
  const assistantFrame = $('.assistant');
  if (assistantState && assistantFrame) {
    assistantFrame.addEventListener('load', () => { assistantState.textContent = 'LIVE'; }, { once: true });
  }

  /* Reveal on scroll, with a decode/scramble pass for headings marked [data-decode] */
  const DECODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&';
  function decodeText(el) {
    const final = el.textContent;
    if (reduceMotion) return;
    const len = final.length;
    const totalFrames = Math.min(100, len * 14);
    let frame = 0;
    const step = () => {
      const revealed = Math.floor((frame / totalFrames) * len);
      let out = '';
      for (let i = 0; i < len; i++) {
        out += final[i] === ' ' || i < revealed ? final[i] : DECODE_CHARS[(Math.random() * DECODE_CHARS.length) | 0];
      }
      el.textContent = out;
      frame++;
      if (frame <= totalFrames) requestAnimationFrame(step); else el.textContent = final;
    };
    step();
  }

  const io = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('in');
    if (entry.target.hasAttribute('data-decode')) decodeText(entry.target);
    io.unobserve(entry.target);
  }), { threshold: 0.2 });
  $$('.reveal, [data-decode]').forEach(el => io.observe(el));

  if (reduceMotion || !canHover) {
    /* Still-useful on touch/reduced-motion: a static spotlight position, no tracking. */
    return;
  }
  document.documentElement.classList.add('has-cursor');

  /* Glass-panel spotlight + subtle 3D tilt toward the cursor */
  const glassPanels = $$('.glass');
  glassPanels.forEach(panel => {
    panel.addEventListener('pointerenter', () => panel.classList.add('tilting'));
    panel.addEventListener('pointermove', e => {
      const r = panel.getBoundingClientRect();
      const lx = e.clientX - r.left, ly = e.clientY - r.top;
      panel.style.setProperty('--x', `${lx}px`);
      panel.style.setProperty('--y', `${ly}px`);
      const nx = lx / r.width - 0.5, ny = ly / r.height - 0.5;
      panel.style.setProperty('--ry', `${(nx * 6).toFixed(2)}deg`);
      panel.style.setProperty('--rx', `${(-ny * 6).toFixed(2)}deg`);
    }, { passive: true });
    panel.addEventListener('pointerleave', () => {
      panel.classList.remove('tilting');
      panel.style.setProperty('--rx', '0deg');
      panel.style.setProperty('--ry', '0deg');
    });
  });

  /* Custom reticle cursor: instant dot, lagging ring, swaps state over interactive targets */
  const cursorEl = $('.cursor');
  const cursorRing = $('.ring', cursorEl);
  const cursorDot = $('.dot', cursorEl);
  document.addEventListener('pointerover', e => {
    cursorEl.classList.toggle('hover', !!e.target.closest('a, button, [data-magnetic], .glass'));
  }, { passive: true });

  /* Update pointer effects only on pointer movement instead of running a permanent frame loop. */
  const magnets = $$('[data-magnetic]').map(el => ({
    el, strength: +el.dataset.strength || 0.3,
  }));
  const wash = $('.wash');

  let pointerFrame = 0;
  let pointerX = 0, pointerY = 0;
  addEventListener('pointermove', e => {
    pointerX = e.clientX;
    pointerY = e.clientY;
    if (pointerFrame) return;
    pointerFrame = requestAnimationFrame(() => {
      pointerFrame = 0;
      if (coordEl) coordEl.textContent = `X ${String(pointerX).padStart(4, '0')} · Y ${String(pointerY).padStart(4, '0')}`;
    magnets.forEach(m => {
      const r = m.el.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const dx = pointerX - cx, dy = pointerY - cy;
      const dist = Math.hypot(dx, dy);
      const radius = Math.max(r.width, r.height) * 1.6 + 80;
      if (dist < radius) {
        const pull = 1 - dist / radius;
        m.el.style.transform = `translate3d(${(dx * m.strength * pull).toFixed(2)}px, ${(dy * m.strength * pull).toFixed(2)}px, 0)`;
      } else {
        m.el.style.transform = '';
      }
    });

      if (wash) wash.style.transform = `translate3d(${((pointerX - innerWidth / 2) * 0.03).toFixed(2)}px, ${((pointerY - innerHeight / 2) * 0.03).toFixed(2)}px, 0)`;
      cursorRing.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0)`;
      cursorDot.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0)`;
    });
  }, { passive: true });
  addEventListener('pointerleave', () => {
    magnets.forEach(({ el }) => { el.style.transform = ''; });
  });
})();
