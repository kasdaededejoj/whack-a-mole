// Round 1 — Perception Gate
// 7 questions: 3 observation (look → answer), 4 authentication (pick the real one)
// Pass = 5/7 correct. Fail = 24hr lockout via gate.js.
// No changes to round2.js, round3.js, game.js (except initGame wiring in gate).

import { state } from '../state.js';
import { field } from '../ui.js';
import { setLockout } from '../gate.js';

// ── SEQUENCE ──
// auth / observe / auth / observe / auth / observe / auth
const SEQUENCE = ['auth','observe','auth','observe','auth','observe','auth'];

// ── GLYPHS ──
// "Real" set — brand-adjacent forms
const REAL_GLYPHS  = ['†', '⌀', '⊘', '∅', '⊕'];
// Noise set — close but wrong
const NOISE_GLYPHS = ['✝', 'Ø', 'θ', 'ø', 'φ', 'ψ', 'δ', '÷', '⊗', 'ξ'];

// ── OBSERVE PROMPTS ──
// Each shows a composition for 2s then asks one question.
const OBSERVE_QUESTIONS = [
  {
    build: () => buildObserveComposition('single', '†'),
    question: 'how many elements?',
    options: ['1', '2', '3'],
    answer: '1',
  },
  {
    build: () => buildObserveComposition('asymmetric', ['⌀','⌀','⌀']),
    question: 'where was the asymmetry?',
    options: ['left', 'centre', 'right'],
    answer: 'left',
  },
  {
    build: () => buildObserveComposition('pair', ['†','⌀']),
    question: 'which appeared first?',
    options: ['†', '⌀', 'simultaneously'],
    answer: 'simultaneously',
  },
];

// ── AUTH PROMPTS ──
// Shows 3 options, one is "real" (from REAL_GLYPHS), others are noise.
// Instruction: "identify the form."
const AUTH_COUNT = 4;

// ── STATE ──
let qIndex = 0;
let correct = 0;
let onRound1Complete = null; // callback to game.js endRound / startRound(1)
let onRound1Fail = null;
let observeIdx = 0;

// ── ENTRY POINT ──
export function startRound1(onPass, onFail) {
  onRound1Complete = onPass;
  onRound1Fail = onFail;
  qIndex = 0;
  correct = 0;
  observeIdx = 0;
  state.running = true;
  nextQuestion();
}

export function endRound1() {
  state.running = false;
  if (field) field.innerHTML = '';
}

// Called by game.js spawnLoop import — stub to avoid import errors
export function spawnLoop() {}

// Dev info
export function getRound1DebugInfo() {
  return { qIndex, correct, running: state.running };
}

// ── QUESTION ROUTER ──
function nextQuestion() {
  if (!state.running) return;
  if (qIndex >= SEQUENCE.length) {
    conclude();
    return;
  }
  field.innerHTML = '';
  const type = SEQUENCE[qIndex];
  if (type === 'observe') {
    showObserve(OBSERVE_QUESTIONS[observeIdx % OBSERVE_QUESTIONS.length]);
    observeIdx++;
  } else {
    showAuth();
  }
}

// ── PROGRESS BAR ──
function renderProgress() {
  const wrap = document.createElement('div');
  wrap.className = 'r1-progress';
  for (let i = 0; i < SEQUENCE.length; i++) {
    const dot = document.createElement('span');
    dot.className = 'r1-dot' + (i < qIndex ? ' r1-dot-done' : i === qIndex ? ' r1-dot-active' : '');
    wrap.appendChild(dot);
  }
  return wrap;
}

// ── OBSERVE ──
function buildObserveComposition(type, glyphs) {
  const wrap = document.createElement('div');
  wrap.className = 'r1-observe-comp';
  if (type === 'single') {
    const g = document.createElement('span');
    g.className = 'r1-glyph r1-glyph-lg';
    g.textContent = glyphs;
    wrap.appendChild(g);
  } else if (type === 'asymmetric') {
    // three items, left-heavy
    const positions = [
      {left:'18%', top:'40%'},
      {left:'36%', top:'55%'},
      {left:'60%', top:'38%'},
    ];
    glyphs.forEach((g, i) => {
      const el = document.createElement('span');
      el.className = 'r1-glyph r1-glyph-sm';
      el.textContent = g;
      el.style.position = 'absolute';
      el.style.left = positions[i].left;
      el.style.top = positions[i].top;
      wrap.appendChild(el);
    });
    wrap.style.position = 'relative';
  } else if (type === 'pair') {
    glyphs.forEach(g => {
      const el = document.createElement('span');
      el.className = 'r1-glyph r1-glyph-md';
      el.textContent = g;
      wrap.appendChild(el);
    });
    wrap.style.gap = '3rem';
    wrap.style.display = 'flex';
    wrap.style.justifyContent = 'center';
    wrap.style.alignItems = 'center';
    wrap.style.width = '100%';
  }
  return wrap;
}

function showObserve(q) {
  field.innerHTML = '';
  // Progress
  field.appendChild(renderProgress());

  // Label
  const label = document.createElement('p');
  label.className = 'r1-label';
  label.textContent = 'observe.';
  field.appendChild(label);

  // Composition — show for 2.2s then hide
  const compWrap = document.createElement('div');
  compWrap.className = 'r1-comp-wrap';
  const comp = q.build();
  compWrap.appendChild(comp);
  field.appendChild(compWrap);

  // Animate in
  requestAnimationFrame(() => compWrap.classList.add('r1-comp-visible'));

  setTimeout(() => {
    // Fade out composition
    compWrap.classList.remove('r1-comp-visible');
    compWrap.classList.add('r1-comp-hidden');

    setTimeout(() => {
      // Show question + options
      showQuestion(q);
    }, 400);
  }, 2200);
}

function showQuestion(q) {
  // Remove comp, keep progress + label
  const compWrap = field.querySelector('.r1-comp-wrap');
  if (compWrap) compWrap.remove();

  const qEl = document.createElement('p');
  qEl.className = 'r1-question';
  qEl.textContent = q.question;
  field.appendChild(qEl);

  const opts = document.createElement('div');
  opts.className = 'r1-options';
  q.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'r1-opt';
    btn.textContent = opt;
    btn.addEventListener('click', () => {
      if (!state.running) return;
      const isCorrect = opt === q.answer;
      if (isCorrect) correct++;
      flashFeedback(btn, isCorrect, opts, () => {
        qIndex++;
        nextQuestion();
      });
    });
    opts.appendChild(btn);
  });
  field.appendChild(opts);
}

// ── AUTH ──
function showAuth() {
  field.innerHTML = '';
  field.appendChild(renderProgress());

  const label = document.createElement('p');
  label.className = 'r1-label';
  label.textContent = 'identify the form.';
  field.appendChild(label);

  // Pick 1 real, 2 noise — shuffle
  const real = REAL_GLYPHS[Math.floor(Math.random() * REAL_GLYPHS.length)];
  const noisePool = NOISE_GLYPHS.filter(n => n !== real);
  const noise = shuffle(noisePool).slice(0, 2);
  const options = shuffle([real, ...noise]);

  const grid = document.createElement('div');
  grid.className = 'r1-auth-grid';

  options.forEach(glyph => {
    const btn = document.createElement('button');
    btn.className = 'r1-auth-opt';
    btn.textContent = glyph;
    btn.addEventListener('click', () => {
      if (!state.running) return;
      const isCorrect = glyph === real;
      if (isCorrect) correct++;
      flashFeedback(btn, isCorrect, grid, () => {
        qIndex++;
        nextQuestion();
      });
    });
    grid.appendChild(btn);
  });

  field.appendChild(grid);
}

// ── FEEDBACK ──
function flashFeedback(btn, isCorrect, container, cb) {
  // Disable all options immediately
  container.querySelectorAll('button').forEach(b => {
    b.disabled = true;
    b.style.pointerEvents = 'none';
  });
  btn.classList.add(isCorrect ? 'r1-correct' : 'r1-wrong');
  setTimeout(cb, 600);
}

// ── CONCLUDE ──
function conclude() {
  state.running = false;
  field.innerHTML = '';

  const passed = correct >= 5;
  const msg = document.createElement('p');
  msg.className = 'r1-conclude';

  if (passed) {
    msg.textContent = '—';
    field.appendChild(msg);
    setTimeout(() => {
      if (onRound1Complete) onRound1Complete();
    }, 800);
  } else {
    setLockout();
    msg.textContent = 'this does not open for most.';
    field.appendChild(msg);
    // After brief pause, reload — gate.js will catch the lockout on next load
    setTimeout(() => { location.reload(); }, 1800);
  }
}

// ── UTILS ──
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
