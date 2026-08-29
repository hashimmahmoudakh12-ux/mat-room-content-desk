/* ============================================================
   fx.js — confetti, toasts, milestone overlay, flame marks
   ============================================================ */

const FX = (function () {
  const canvas = document.getElementById('fx-canvas');
  const ctx = canvas.getContext('2d');
  let particles = [];
  let running = false;
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const PALETTE = ['#DA291C', '#0B0B0C', '#F2EFE8', '#6E757C', '#A81B12', '#FAF8F4'];

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  function spawn(n, origin, power) {
    const ox = origin && origin.x != null ? origin.x : window.innerWidth / 2;
    const oy = origin && origin.y != null ? origin.y : window.innerHeight * 0.34;
    for (let i = 0; i < n; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (2 + Math.random() * 7) * (power || 1);
      particles.push({
        x: ox, y: oy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 4 * (power || 1),
        w: 4 + Math.random() * 7,
        h: 6 + Math.random() * 10,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.35,
        color: PALETTE[(Math.random() * PALETTE.length) | 0],
        life: 90 + Math.random() * 60,
        age: 0
      });
    }
    if (!running) { running = true; requestAnimationFrame(tick); }
  }

  function tick() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    particles = particles.filter(function (p) { return p.age < p.life && p.y < window.innerHeight + 60; });
    particles.forEach(function (p) {
      p.age++;
      p.vy += 0.22;         /* gravity */
      p.vx *= 0.995;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      const fade = Math.max(0, 1 - p.age / p.life);
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
    if (particles.length) requestAnimationFrame(tick);
    else { running = false; ctx.clearRect(0, 0, window.innerWidth, window.innerHeight); }
  }

  /* ---------- public ---------- */
  return {
    confetti: function (origin) {
      if (reduced) return;
      spawn(70, origin, 1);
    },
    bigConfetti: function () {
      if (reduced) return;
      const w = window.innerWidth, h = window.innerHeight;
      spawn(90, { x: w * 0.5, y: h * 0.38 }, 1.5);
      setTimeout(function () { spawn(70, { x: w * 0.18, y: h * 0.5 }, 1.4); }, 170);
      setTimeout(function () { spawn(70, { x: w * 0.82, y: h * 0.5 }, 1.4); }, 320);
      setTimeout(function () { spawn(60, { x: w * 0.5, y: h * 0.3 }, 1.3); }, 520);
    },

    toast: function (title, body, variant) {
      const stack = document.getElementById('toasts');
      const node = el('div', { class: 'toast' + (variant ? ' toast--' + variant : '') }, [
        el('strong', { text: title }),
        body ? el('span', { text: body }) : null
      ]);
      stack.appendChild(node);
      setTimeout(function () {
        node.classList.add('is-out');
        setTimeout(function () { node.remove(); }, 300);
      }, 4200);
    },

    milestone: function (n) {
      const copy = StreakCopy.milestone(n);
      if (!copy) return;
      document.getElementById('milestone-kicker').textContent = copy.kicker;
      document.getElementById('milestone-num').textContent = n;
      document.getElementById('milestone-title').textContent = copy.title;
      document.getElementById('milestone-body').textContent = copy.body;
      document.getElementById('milestone').hidden = false;
      FX.bigConfetti();
    },

    closeMilestone: function () {
      document.getElementById('milestone').hidden = true;
    }
  };
})();

/* ---------- flame mark (inline SVG, inherits currentColor) ---------- */
function flameSVG(lit) {
  const span = el('span', { class: 'flame' + (lit ? ' is-lit' : '') });
  span.innerHTML =
    '<svg viewBox="0 0 24 28" width="100%" height="100%" aria-hidden="true">' +
    '<path fill="' + (lit ? '#DA291C' : 'currentColor') + '" d="M12 0c1.4 5.2-2.6 6.6-4.6 9.7C5.6 12.6 5 14.9 5 17.1 5 23 8.9 28 12 28s7-5 7-10.9c0-3.7-1.9-6.6-4-9.2-.6 1.8-1.7 2.8-2.8 3.3.9-3.6.9-7.7-.2-11.2z"/>' +
    '<path fill="' + (lit ? '#F2EFE8' : 'transparent') + '" opacity=".85" d="M12 28c-1.8 0-3.4-2.3-3.4-4.9 0-2.4 1.9-3.7 2.6-5.6.8 1.4 1.2 1.9 2 2.6 1 .9 2.2 2 2.2 3.5C15.4 25.9 13.8 28 12 28z"/>' +
    '</svg>';
  return span;
}

function flameRow(count, max) {
  const row = el('div', { class: 'flame-row' });
  const shown = Math.max(max || 10, Math.min(count, 16));
  for (let i = 0; i < shown; i++) row.appendChild(flameSVG(i < count));
  return row;
}
