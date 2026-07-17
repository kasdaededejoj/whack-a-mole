// Main Game Orchestration
import { state } from './state.js';
import { initAudio } from './audio.js';
import { initHomepage } from './homepage.js';
import { 
  initDOMRefs, field, msgEl, failOverlay,
  barEl, roundOverlay, roundText, gameScreen, welcomeScreen,
  portalScreen, portalTimer, glitchTrans, portalQR, duelScreen,
  setScoreValue, setComboValue, setMissesValue, showHudActive, showFail
} from './ui.js';
import { spawnLoop, startRound1, endRound1 } from './rounds/round1.js';
import { initGate } from './gate.js';
import { startInvaders, stopInvaders, handleInvaderKeydown } from './rounds/round2.js';
import { startDuel, stopDuel } from './rounds/round3.js';
import { getAudio } from './audio.js';
import { initDevPanel } from './devpanel.js';

// Round configurations
const ROUNDS = [
  { speed: 1400, max: 3, dur: 30000, threshold: 1749, type: 'mole' },
  { dur: 120000, threshold: 0, type: 'invaders' },
  { type: 'duel' },
];

export function startRound(idx) {
  failOverlay.classList.remove('active');
  state.currentRound = idx;
  state.roundScore = 0;
  state.misses = 0;
  state.combo = 1;
  state.running = true;
  const round = ROUNDS[idx];
  state.timeLeft = round.dur;
  gameScreen.classList.add('active');
  showHudActive();
  setScoreValue('0');
  setMissesValue('0');
  setComboValue('×1');
  msgEl.textContent = '';
  barEl.style.width = '100%';
  field.innerHTML = '';
  state.moles = [];

  if (round.type === 'invaders') {
    startInvaders();
  } else if (round.type === 'duel') {
    // duel manages its own screen
    gameScreen.classList.remove('active');
    clearInterval(state.bTimer);
    startDuel();
    return;
  } else {
    // Round 1 — perception gate mechanic manages its own flow
    clearInterval(state.bTimer);
    barEl.style.width = '0%';
    startRound1(
      () => { endRound(); },   // pass → endRound() → showRoundTransition → startRound(1)
      () => { endRound(); }    // fail handled internally (lockout + reload), endRound cleans up
    );
    return;
  }

  const t0 = Date.now();
  state.bTimer = setInterval(() => {
    state.timeLeft = round.dur - (Date.now() - t0);
    barEl.style.width = Math.max(0, (state.timeLeft / round.dur) * 100) + '%';
    if (state.timeLeft <= 0) {
      clearInterval(state.bTimer);
      endRound();
    }
  }, 50);
}

export function endRound() {
  state.running = false;
  clearTimeout(state.gTimer);
  clearInterval(state.bTimer);
  state.moles.forEach(m => {
    if (m.alive) {
      clearTimeout(m.timer);
      m.el.remove();
    }
  });
  state.moles = [];
  stopInvaders();
  stopDuel();
  endRound1();
  barEl.style.width = '0%';

  const round = ROUNDS[state.currentRound];
  // Round 1 (mole) manages its own pass/fail — always treat as passed here
  const passed = round.type === 'mole' ? true
    : round.type === 'invaders' ? true
    : state.roundScore >= round.threshold;
  const isLast = state.currentRound === ROUNDS.length - 1;

  if (!passed) {
    showFail(state.currentRound);
    return;
  }

  if (isLast) {
    msgEl.textContent = '';
    setTimeout(() => glitchToPortal(), 600);
    return;
  }

  const next = state.currentRound + 1;
  const labels = ['—', '——', '———'];
  showRoundTransition(labels[next], () => startRound(next));
}

export function showRoundTransition(label, cb) {
  roundText.textContent = label;
  roundText.style.animation = 'none';
  roundOverlay.classList.add('show');
  void roundText.offsetWidth;
  roundText.style.animation = 'glitchIn .6s ease forwards';
  setTimeout(() => {
    roundOverlay.classList.remove('show');
    cb();
  }, 1800);
}

export function playPortalDrone() {
  try {
    const ctx = getAudio();
    const now = ctx.currentTime;
    // Sub-bass rumble
    const freqs = [28, 41, 55, 73];
    freqs.forEach((fr, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(fr, now);
      osc.frequency.linearRampToValueAtTime(fr * 0.85, now + 4);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.12 - i * 0.02, now + 1.2);
      g.gain.linearRampToValueAtTime(0.06, now + 3.5);
      g.gain.linearRampToValueAtTime(0, now + 4.5);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 300 + i * 40;
      osc.connect(lp);
      lp.connect(g);
      g.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 4.6);
    });
    // High shimmer sweep
    const shimOsc = ctx.createOscillator();
    shimOsc.type = 'sine';
    shimOsc.frequency.setValueAtTime(2200, now + 0.5);
    shimOsc.frequency.exponentialRampToValueAtTime(800, now + 3.5);
    const shimG = ctx.createGain();
    shimG.gain.setValueAtTime(0, now + 0.5);
    shimG.gain.linearRampToValueAtTime(0.07, now + 1.2);
    shimG.gain.linearRampToValueAtTime(0, now + 3.8);
    shimOsc.connect(shimG);
    shimG.connect(ctx.destination);
    shimOsc.start(now + 0.5);
    shimOsc.stop(now + 4);
  } catch (e) { }
}

export function glitchToPortal() {
  const gt = glitchTrans;
  gt.innerHTML = '';
  gt.classList.add('active');

  // Build a canvas for the dystopic CRT effect
  const cvs = document.createElement('canvas');
  cvs.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
  cvs.width = window.innerWidth;
  cvs.height = window.innerHeight;
  gt.appendChild(cvs);
  const ctx = cvs.getContext('2d');

  playPortalDrone();

  const W = cvs.width, H = cvs.height;
  let elapsed = 0, last = 0;
  const DURATION = 2600; // ms total before portal appears

  function drawFrame(ts) {
    if (!last) last = ts;
    const dt = ts - last;
    last = ts;
    elapsed += dt;
    const progress = Math.min(elapsed / DURATION, 1);

    ctx.clearRect(0, 0, W, H);

    // ── Base fill — black with slight desaturated noise ──
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    // ── Horizontal scanlines crawling downward ──
    const scanSpeed = H * 0.18 * progress;
    const lineSpacing = 4;
    for (let y = 0; y < H; y += lineSpacing) {
      const shimmer = 0.03 + 0.04 * Math.sin((y + elapsed * 0.08) * 0.15) * progress;
      ctx.fillStyle = `rgba(255,255,255,${shimmer})`;
      ctx.fillRect(0, y, W, 1);
    }

    // ── Chromatic aberration RGB slices ──
    const aberration = Math.min(progress * 1.4, 1);
    const numBands = Math.floor(3 + progress * 9);
    for (let i = 0; i < numBands; i++) {
      const bY = Math.random() * H;
      const bH = 1 + Math.random() * 6;
      const shift = (Math.random() - 0.5) * aberration * 22;
      const alpha = 0.06 + Math.random() * 0.12 * aberration;
      // R channel left, B channel right
      ctx.fillStyle = `rgba(255,0,60,${alpha})`;
      ctx.fillRect(shift, bY, W, bH);
      ctx.fillStyle = `rgba(0,180,255,${alpha})`;
      ctx.fillRect(-shift, bY, W, bH);
    }

    // ── Vertical glitch tears — appear mid-transition ──
    if (progress > 0.35) {
      const tearIntensity = (progress - 0.35) / 0.65;
      const numTears = Math.floor(tearIntensity * 8);
      for (let i = 0; i < numTears; i++) {
        const tX = Math.random() * W;
        const tH = 2 + Math.random() * 14 * tearIntensity;
        const tY = Math.random() * H;
        const offset = (Math.random() - 0.5) * tearIntensity * 40;
        ctx.fillStyle = `rgba(255,255,255,${0.08 + Math.random() * 0.18 * tearIntensity})`;
        ctx.fillRect(tX + offset, tY, Math.random() * 80 + 20, tH);
      }
    }

    // ── White vignette crush inward at end ──
    if (progress > 0.7) {
      const crushAlpha = (progress - 0.7) / 0.3;
      const grad = ctx.createRadialGradient(W / 2, H / 2, H * 0.1, W / 2, H / 2, H * 0.85);
      grad.addColorStop(0, `rgba(255,255,255,0)`);
      grad.addColorStop(1, `rgba(255,255,255,${crushAlpha * 0.55})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }

    // ── Final white flash ──
    if (progress > 0.9) {
      ctx.fillStyle = `rgba(255,255,255,${(progress - 0.9) * 8})`;
      ctx.fillRect(0, 0, W, H);
    }

    if (progress < 1) {
      requestAnimationFrame(drawFrame);
    } else {
      // Hold white for a beat then reveal portal
      setTimeout(() => {
        gt.classList.remove('active');
        gt.innerHTML = '';
        if (duelScreen) duelScreen.classList.remove('active');
        gameScreen.classList.remove('active');
        showPortal();
      }, 120);
    }
  }
  requestAnimationFrame(drawFrame);
}

export function showPortal() {
  portalScreen.classList.add('active');
  portalQR.style.animation = 'none';
  void portalQR.offsetWidth;
  portalQR.style.animation = 'portalReveal .8s ease forwards';

  // ── Persistent ambient shimmer overlay ──
  let shimmerRaf = null;
  const shimCvs = document.createElement('canvas');
  shimCvs.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:0.45;mix-blend-mode:screen;';
  shimCvs.width = window.innerWidth;
  shimCvs.height = window.innerHeight;
  portalScreen.appendChild(shimCvs);
  const sCtx = shimCvs.getContext('2d');
  const SW = shimCvs.width, SH = shimCvs.height;
  let shimStart = Date.now();
  function drawShimmer() {
    const t = (Date.now() - shimStart) * 0.001;
    sCtx.clearRect(0, 0, SW, SH);
    // Slow scanline crawl
    for (let y = 0; y < SH; y += 3) {
      const a = 0.012 + 0.008 * Math.sin(y * 0.04 + t * 0.4);
      sCtx.fillStyle = `rgba(255,255,255,${a})`;
      sCtx.fillRect(0, y, SW, 1);
    }
    // Occasional horizontal flicker band
    if (Math.random() < 0.04) {
      const fy = Math.random() * SH;
      sCtx.fillStyle = `rgba(255,255,255,${0.03 + Math.random() * 0.06})`;
      sCtx.fillRect(0, fy, SW, 1 + Math.floor(Math.random() * 4));
    }
    shimmerRaf = requestAnimationFrame(drawShimmer);
  }
  shimmerRaf = requestAnimationFrame(drawShimmer);

  let t = 8;
  portalTimer.textContent = '';
  setTimeout(() => {
    const cd = setInterval(() => {
      portalTimer.textContent = 'fades in ' + t + 's';
      t--;
      if (t < 0) {
        clearInterval(cd);
        if (shimmerRaf) { cancelAnimationFrame(shimmerRaf); shimmerRaf = null; }
        shimCvs.remove();
        portalQR.style.animation = 'none';
        portalQR.style.transition = 'transform .4s cubic-bezier(.55,.06,.68,.19), opacity .4s';
        portalQR.style.transform = 'scale(0.2) translateY(-80px)';
        portalQR.style.opacity = '0';
        setTimeout(() => {
          portalScreen.classList.remove('active');
          portalQR.style.transform = '';
          portalQR.style.opacity = '';
          portalQR.style.transition = '';
          state.currentRound = 0;
          state.totalScore = 0;
          welcomeScreen.classList.add('active');
          failOverlay.classList.remove('active');
        }, 450);
      }
    }, 1000);
  }, 1000);
}

// Initialize game on page load
export function initGame() {
  // Initialize DOM references first
  initDOMRefs();

  // Gate check — must run before anything else is shown
  initGate(welcomeScreen);
  
  // Setup event listeners
  document.addEventListener('click', initAudio);
  document.addEventListener('touchstart', initAudio, { passive: true });
  
  // Initialize homepage glitch effect
  initHomepage();
  
  // Initialize hidden dev/debug panel (Shift+D to open)
  initDevPanel();
  
  // Nuka skill keyboard input (Space to activate, a-z to resolve prompt)
  document.addEventListener('keydown', handleInvaderKeydown);
  
  // Wire up begin button to start game
  document.getElementById('ok-btn').addEventListener('click', () => {
    welcomeScreen.classList.remove('active');
    startRound(0);
  });
}
