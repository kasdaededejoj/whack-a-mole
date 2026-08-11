// Gate — runs before welcome screen on every load.
// Lockout screen includes:
//   - countdown timer
//   - diamond-in-diamond tracing puzzle (secret bypass → Round 1)
//   - Shift+D dev bypass → welcome screen immediately

const LOCKOUT_KEY = 'realm_lockout_until';
const LOCKOUT_DURATION = 24 * 60 * 60 * 1000;

function getLockoutRemaining() {
  try {
    const until = parseInt(localStorage.getItem(LOCKOUT_KEY) || '0', 10);
    return Math.max(0, until - Date.now());
  } catch (e) { return 0; }
}

export function setLockout() {
  try { localStorage.setItem(LOCKOUT_KEY, String(Date.now() + LOCKOUT_DURATION)); } catch (e) {}
}

export function clearLockout() {
  try { localStorage.removeItem(LOCKOUT_KEY); } catch (e) {}
}

function pad(n) { return String(n).padStart(2, '0'); }

function formatCountdown(ms) {
  const s = Math.ceil(ms / 1000);
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

// ── DIAMOND TRACING ──────────────────────────────────────────────────────────
// Two concentric diamonds. Player traces outer first (4 vertices in order),
// then inner (4 vertices in order). Strict: must pass within HIT_R px of each
// vertex in sequence. Ghost trail drawn on canvas; colour shifts
// white → purple proportional to vertices hit across the current diamond.

const HIT_R = 22; // px — strict but accounts for slight motor imprecision

function getDiamondVertices(cx, cy, r) {
  // top, right, bottom, left — clockwise starting from top
  return [
    { x: cx,     y: cy - r },
    { x: cx + r, y: cy     },
    { x: cx,     y: cy + r },
    { x: cx - r, y: cy     },
  ];
}

function lerpColor(t) {
  // t: 0→1  white → purple  rgba
  const r = Math.round(255 - t * (255 - 160));
  const g = Math.round(255 - t * (255 - 60));
  const b = Math.round(255 - t * (255 - 255));
  return `rgba(${r},${g},${b},`;
}

function initTracing(canvas, onSolved) {
  const ctx = canvas.getContext('2d');
  let trail = [];         // [{x,y}] current stroke
  let phase = 0;          // 0 = outer diamond, 1 = inner diamond
  let nextVertex = 0;     // which vertex we're waiting for in current phase
  let hitsThisPhase = 0;  // how many vertices hit in current phase (for colour)
  let drawing = false;
  let flashTimer = null;

  function resize() {
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function outerR() { return Math.min(canvas.width, canvas.height) * 0.28; }
  function innerR() { return outerR() * 0.45; }
  function cx()    { return canvas.width  * 0.5; }
  function cy()    { return canvas.height * 0.5; }

  function drawGhostDiamonds() {
    const o = getDiamondVertices(cx(), cy(), outerR());
    const i = getDiamondVertices(cx(), cy(), innerR());
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    [o, i].forEach(verts => {
      ctx.beginPath();
      ctx.moveTo(verts[0].x, verts[0].y);
      verts.forEach((v,idx) => { if(idx) ctx.lineTo(v.x, v.y); });
      ctx.closePath();
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawTrail() {
    if (trail.length < 2) return;
    const total = (phase === 0 ? 4 : 8); // max hits across both phases
    const hits  = (phase === 0 ? hitsThisPhase : 4 + hitsThisPhase);
    const t = Math.min(hits / 4, 1); // colour based on current phase progress
    ctx.save();
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 1; i < trail.length; i++) {
      const seg = i / trail.length;
      const alpha = 0.15 + seg * 0.7;
      ctx.strokeStyle = lerpColor(t) + alpha + ')';
      ctx.beginPath();
      ctx.moveTo(trail[i-1].x, trail[i-1].y);
      ctx.lineTo(trail[i].x,   trail[i].y);
      ctx.stroke();
    }
    // Cursor dot
    const last = trail[trail.length - 1];
    ctx.fillStyle = lerpColor(t) + '0.9)';
    ctx.beginPath();
    ctx.arc(last.x, last.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGhostDiamonds();
    drawTrail();
  }

  function getVerts() {
    return phase === 0
      ? getDiamondVertices(cx(), cy(), outerR())
      : getDiamondVertices(cx(), cy(), innerR());
  }

  function checkVertex(x, y) {
    if (nextVertex >= 4) return;
    const v = getVerts()[nextVertex];
    const dx = x - v.x, dy = y - v.y;
    if (Math.sqrt(dx*dx + dy*dy) <= HIT_R) {
      nextVertex++;
      hitsThisPhase++;
      if (nextVertex === 4) {
        // Completed this phase
        if (phase === 0) {
          // Outer done — reset for inner
          phase = 1;
          nextVertex = 0;
          hitsThisPhase = 0;
          trail = [];
        } else {
          // Both done — solved
          solved();
        }
      }
    }
  }

  function solved() {
    drawing = false;
    // Full purple flash
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGhostDiamonds();
    ctx.save();
    ctx.fillStyle = 'rgba(160,60,255,0.18)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    clearLockout();
    setTimeout(onSolved, 320);
  }

  function pointerPos(e) {
    const r = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - r.left, y: src.clientY - r.top };
  }

  function onStart(e) {
    e.preventDefault();
    // Reset if starting a new stroke — if user lifts and starts again,
    // only reset vertex progress if they've left the canvas for >300ms
    drawing = true;
    trail = [];
    const p = pointerPos(e);
    trail.push(p);
    checkVertex(p.x, p.y);
    render();
  }

  function onMove(e) {
    if (!drawing) return;
    e.preventDefault();
    const p = pointerPos(e);
    trail.push(p);
    if (trail.length > 180) trail.splice(0, trail.length - 180);
    checkVertex(p.x, p.y);
    render();
  }

  function onEnd(e) {
    e.preventDefault();
    drawing = false;
    // If they lifted without completing the current diamond, reset that phase
    if (nextVertex > 0 && nextVertex < 4) {
      nextVertex = 0;
      hitsThisPhase = 0;
      trail = [];
      render();
    }
  }

  canvas.addEventListener('mousedown',  onStart, { passive: false });
  canvas.addEventListener('mousemove',  onMove,  { passive: false });
  canvas.addEventListener('mouseup',    onEnd,   { passive: false });
  canvas.addEventListener('mouseleave', onEnd,   { passive: false });
  canvas.addEventListener('touchstart', onStart, { passive: false });
  canvas.addEventListener('touchmove',  onMove,  { passive: false });
  canvas.addEventListener('touchend',   onEnd,   { passive: false });
}

// ── LOCKOUT SCREEN ───────────────────────────────────────────────────────────

function buildLockoutScreen() {
  const el = document.createElement('div');
  el.id = 'gate-lockout';
  el.innerHTML = `
    <div id="gate-inner">
      <p id="gate-copy">this does not open for most.<br>
        <span id="gate-sub">...unless the user seeks to challenge that theory.</span>
      </p>
      <p id="gate-timer"></p>
      <canvas id="gate-canvas"></canvas>
    </div>
  `;
  document.body.appendChild(el);
  return el;
}

function unlockAnimation(lockoutEl, onDone) {
  const inner = lockoutEl.querySelector('#gate-inner');
  let f = 0;
  const frames = [
    () => { inner.style.filter = 'invert(1) brightness(3)'; inner.style.transform = 'skewX(6deg) scale(1.02)'; },
    () => { inner.style.filter = 'none'; inner.style.transform = 'skewX(-4deg)'; },
    () => { inner.style.filter = 'invert(1)'; inner.style.transform = 'skewX(0) scale(0.98)'; inner.style.opacity = '0.6'; },
    () => { inner.style.filter = 'brightness(4)'; inner.style.transform = 'none'; inner.style.opacity = '0.3'; },
    () => { inner.style.filter = 'none'; inner.style.opacity = '0'; },
  ];
  function next() {
    if (f >= frames.length) {
      lockoutEl.style.transition = 'opacity .4s ease';
      lockoutEl.style.opacity = '0';
      setTimeout(() => { lockoutEl.remove(); onDone(); }, 420);
      return;
    }
    frames[f](); f++;
    setTimeout(next, 60 + Math.random() * 40);
  }
  next();
}

// ── INIT ─────────────────────────────────────────────────────────────────────

export function initGate(welcomeScreen, onPuzzleSolved) {
  const remaining = getLockoutRemaining();
  if (remaining <= 0) return false;

  welcomeScreen.classList.remove('active');

  const lockoutEl  = buildLockoutScreen();
  const timerEl    = lockoutEl.querySelector('#gate-timer');
  const canvas     = lockoutEl.querySelector('#gate-canvas');

  // Shift+D dev bypass
  function onKeyDown(e) {
    if (e.shiftKey && e.key === 'D') {
      document.removeEventListener('keydown', onKeyDown);
      clearLockout();
      lockoutEl.remove();
      welcomeScreen.classList.add('active');
    }
  }
  document.addEventListener('keydown', onKeyDown);

  // Tracing puzzle — on solve: clear lockout, fire onPuzzleSolved (→ Round 1)
  initTracing(canvas, () => {
    document.removeEventListener('keydown', onKeyDown);
    clearInterval(interval);
    lockoutEl.remove();
    if (onPuzzleSolved) onPuzzleSolved();
  });

  // Countdown
  function tick() {
    const left = getLockoutRemaining();
    if (left <= 0) {
      clearInterval(interval);
      document.removeEventListener('keydown', onKeyDown);
      unlockAnimation(lockoutEl, () => { welcomeScreen.classList.add('active'); });
      return;
    }
    timerEl.textContent = formatCountdown(left);
  }
  tick();
  const interval = setInterval(tick, 1000);
  return true;
}
