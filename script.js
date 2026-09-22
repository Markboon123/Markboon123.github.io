const toggle = document.querySelector('.nav-toggle');
const links = document.querySelector('.nav-links');

toggle.addEventListener('click', () => {
  const open = links.classList.toggle('open');
  toggle.setAttribute('aria-expanded', open);
});

links.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    links.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  });
});

// highlight the nav link for whichever section is on screen
const navLinks = [...links.querySelectorAll('a')];
const sections = [...document.querySelectorAll('main section[id]')];

const spy = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    navLinks.forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id);
    });
  });
}, { rootMargin: '-40% 0px -55% 0px' });

sections.forEach(s => spy.observe(s));

// fade sections in as they scroll into view
const reveal = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('in');
      reveal.unobserve(e.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.reveal').forEach(el => reveal.observe(el));

// photo stack: clicking sends the front photo to the back
const stack = document.querySelector('.photo-stack');
if (stack) {
  const cards = [...stack.querySelectorAll('.photo-card')];
  const shuffle = () => {
    cards.forEach(c => {
      const pos = Number(c.dataset.pos);
      c.dataset.pos = (pos + cards.length - 1) % cards.length;
    });
  };
  stack.addEventListener('click', shuffle);
  stack.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      shuffle();
    }
  });
}

// top charge card: pressing it fires a blast across the cover, drawn the same
// way as in the game (blue orb, fire trail, hit spark, hitstop + shake)
const tcCover = document.querySelector('.cover-tc');
if (tcCover && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const canvas = document.createElement('canvas');
  canvas.className = 'blast-fx';
  tcCover.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const icon = tcCover.querySelector('.cover-img');
  const title = tcCover.querySelector('.cover-title');
  const shaken = [icon, title, canvas];
  let busy = false;

  const circle = (x, y, r, color, alpha) => {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };
  const ring = (x, y, r, color, width, alpha) => {
    if (width <= 0) return;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
  };
  const line = (x0, y0, x1, y1, color, width, alpha) => {
    if (width <= 0) return;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  };
  const tri = (pts, color, alpha) => {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    ctx.lineTo(pts[2], pts[3]);
    ctx.lineTo(pts[4], pts[5]);
    ctx.closePath();
    ctx.fill();
  };

  const fire = () => {
    if (busy) return;
    busy = true;

    const dpr = window.devicePixelRatio || 1;
    const box = tcCover.getBoundingClientRect();
    canvas.width = Math.round(box.width * dpr);
    canvas.height = Math.round(box.height * dpr);

    const center = el => {
      const r = el.getBoundingClientRect();
      return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2 };
    };
    const a = center(icon);
    const b = center(title);
    const dx = b.x - a.x, dy = b.y - a.y;
    const dist = Math.hypot(dx, dy) || 1;
    const backX = -dx / dist, backY = -dy / dist;

    const FLIGHT = 480, TRAIL = 150, SPARK = 340, HOLD = 70, SHAKE = 240;
    const trail = [];
    const tongues = [];
    const spikes = Array.from({ length: 9 }, (_, i) => ({
      ang: (i / 9) * Math.PI * 2 + Math.random() * 0.3,
      len: 16 + Math.random() * 16,
    }));

    let life = 0, hitAt = -1, last = performance.now();
    const frame = now => {
      const dt = Math.min(50, now - last);
      last = now;
      life += dt;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, box.width, box.height);

      let orb = null;
      if (hitAt < 0) {
        const t = Math.min(1, life / FLIGHT);
        orb = { x: a.x + dx * t, y: a.y + dy * t };
        trail.push({ x: orb.x, y: orb.y, age: 0 });
        // fire peels off the back edge and dies fast, so it licks instead of streaming
        for (let i = 0; i < 3; i++) {
          const spread = (Math.random() - 0.5) * 1.7;
          const speed = 0.035 + Math.random() * 0.06;
          tongues.push({
            x: orb.x + backX * 8, y: orb.y + backY * 8,
            vx: (backX * Math.cos(spread) - backY * Math.sin(spread)) * speed,
            vy: (backX * Math.sin(spread) + backY * Math.cos(spread)) * speed,
            age: 0, life: 150 + Math.random() * 120, size: 10 + Math.random() * 8,
          });
        }
        if (t >= 1) hitAt = life;
      }

      for (const p of trail) p.age += dt;
      while (trail.length && trail[0].age > TRAIL) trail.shift();
      for (let i = tongues.length - 1; i >= 0; i--) {
        const f = tongues[i];
        f.age += dt;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        if (f.age > f.life) tongues.splice(i, 1);
      }

      for (const p of trail) {
        const k = 1 - p.age / TRAIL;
        circle(p.x, p.y, 13 * k, '#1b4fd0', 0.4 * k);
        circle(p.x, p.y, 7 * k, '#5ec8ff', 0.6 * k);
        circle(p.x, p.y, 3 * k, '#e4f5ff', 0.85 * k);
      }
      for (const f of tongues) {
        const k = 1 - f.age / f.life;
        const len = f.size * (0.6 + k);
        const ang = Math.atan2(f.vy, f.vx);
        const tipX = f.x + Math.cos(ang) * len, tipY = f.y + Math.sin(ang) * len;
        const sx = -Math.sin(ang) * f.size * k * 0.45, sy = Math.cos(ang) * f.size * k * 0.45;
        tri([tipX, tipY, f.x + sx, f.y + sy, f.x - sx, f.y - sy], '#2f7ae8', 0.45 * k);
        tri([
          f.x + Math.cos(ang) * len * 0.6, f.y + Math.sin(ang) * len * 0.6,
          f.x + sx * 0.55, f.y + sy * 0.55,
          f.x - sx * 0.55, f.y - sy * 0.55,
        ], '#bfe9ff', 0.6 * k);
      }
      if (orb) {
        const pulse = 1 + Math.sin(life / 50) * 0.15;
        circle(orb.x, orb.y, 24 * pulse, '#7adfff', 0.25);
        circle(orb.x, orb.y, 18 * pulse, '#7adfff', 0.4);
        circle(orb.x, orb.y, 14, '#2a8ee0', 1);
        circle(orb.x, orb.y, 11, '#5ec8ff', 1);
        circle(orb.x, orb.y, 7, '#c8ecff', 1);
        circle(orb.x - 2, orb.y - 2, 3, '#ffffff', 1);
      }

      let done = false;
      if (hitAt >= 0) {
        const since = life - hitAt;
        const t = Math.min(1, since / SPARK);
        const fade = 1 - t;
        if (t < 0.3) {
          const ft = 1 - t / 0.3;
          circle(b.x, b.y, 26 * ft + 8, '#ffffff', 0.9 * ft);
          circle(b.x, b.y, 34 * ft + 10, '#ff6a40', 0.35 * ft);
        }
        for (const s of spikes) {
          const r0 = 6 + t * 18;
          const r1 = r0 + s.len * fade;
          line(b.x + Math.cos(s.ang) * r0, b.y + Math.sin(s.ang) * r0,
               b.x + Math.cos(s.ang) * r1, b.y + Math.sin(s.ang) * r1, '#ffd0a0', 3 * fade, fade);
        }
        ring(b.x, b.y, 12 + t * 30, '#ff8050', 3 * fade, 0.8 * fade);

        // freeze for a beat, then the shake dies off
        let sx = 0, sy = 0;
        if (since > HOLD && since < HOLD + SHAKE) {
          const left = 1 - (since - HOLD) / SHAKE;
          const m = 5 * left * left;
          sx = (Math.random() * 2 - 1) * m;
          sy = (Math.random() * 2 - 1) * m;
        }
        for (const el of shaken) el.style.translate = sx || sy ? `${sx}px ${sy}px` : '';
        done = t >= 1 && since >= HOLD + SHAKE && !tongues.length;
      }

      if (done) {
        ctx.clearRect(0, 0, box.width, box.height);
        for (const el of shaken) el.style.translate = '';
        busy = false;
        return;
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };

  tcCover.closest('.card').addEventListener('click', fire);
}

document.getElementById('year').textContent = new Date().getFullYear();
