// Round 1: Whack-a-Mole
import { state } from '../state.js';
import { randPos, rollTargetType } from '../utils.js';
import { sonidoAppear, cssGlitch, noiseGlitchDisappear } from '../effects.js';
import { playThud, playMiss } from '../audio.js';
import { setScoreValue, setComboValue, setMissesValue, field, msgEl } from '../ui.js';

// Round 1 configuration
const ROUNDS = [
  {name:'whack a mole.',speed:800,max:1,lives:3,duration:40},
  {name:'void invaders.',speed:null,max:null,lives:null,duration:60},
  {name:'duel.',speed:null,max:null,lives:null,duration:60}
];

export function spawnMole() {
  if (!state.running) return;
  const round = ROUNDS[state.currentRound];
  if (state.moles.filter(m => m.alive).length >= round.max) return;
  const pos = randPos();
  const type = rollTargetType();

  const el = document.createElement('div');
  el.className = 'mole-el' + (type === 'purpality' ? ' purpality' : type === 'noise' ? ' noise' : '');

  // Purpality: 40px, faster speed (ratio 0.43 of base speed)
  const spd = type === 'purpality' ? Math.round(round.speed * 0.43) : round.speed;

  el.style.left = pos.x + '%';
  el.style.top = pos.y + '%';
  let inner;
  if (type === 'purpality') {
    inner = document.querySelector('.welcome-figure').cloneNode(true);
    inner.setAttribute('class', 'mole-glyph');
  } else {
    inner = document.createElement('span');
    inner.className = 'mole-glyph';
    if (type === 'noise') inner.textContent = '⌀';
    else inner.textContent = '†';
  }
  const pts = document.createElement('span');
  pts.className = 'pts';
  el.appendChild(inner);
  el.appendChild(pts);
  field.appendChild(el);
  const mole = { el, alive: true, timer: null, type };
  state.moles.push(mole);
  sonidoAppear(el);
  el.addEventListener('click', () => whack(mole, pts));
  mole.timer = setTimeout(() => {
    if (mole.alive) {
      mole.alive = false;
      if (type === 'noise') {
        // Noise expires: no miss penalty, just disappears with reverse anim
        noiseGlitchDisappear(el);
      } else {
        state.misses++;
        state.combo = 1;
        setMissesValue(state.misses);
        setComboValue('×1');
        try { playMiss(); } catch (e) { }
        setTimeout(() => el.remove(), 220);
      }
    }
  }, spd);
}

export function whack(mole, ptsEl) {
  if (!state.running || !mole.alive) return;
  clearTimeout(mole.timer);
  mole.alive = false;
  const type = mole.type || 'normal';

  if (type === 'noise') {
    // Noise hit: -50pts, thud SFX, reverse disappear, break combo
    cssGlitch(mole.el);
    try { playThud(0.6); } catch (e) { }
    const penalty = 50;
    state.roundScore = Math.max(0, state.roundScore - penalty);
    state.totalScore = Math.max(0, state.totalScore - penalty);
    state.combo = 1;
    setScoreValue(state.roundScore);
    setComboValue('×1');
    ptsEl.textContent = '−50';
    ptsEl.style.color = 'rgba(255,60,60,0.9)';
    ptsEl.classList.add('show');
    setTimeout(() => { ptsEl.style.color = ''; }, 600);
    msgEl.textContent = 'noise.';
    setTimeout(() => { if (msgEl.textContent === 'noise.') msgEl.textContent = ''; }, 800);
    return;
  }

  // Normal or purpality
  cssGlitch(mole.el);
  const pitchMult = type === 'purpality' ? 1.3 + Math.min(state.combo, 8) * 0.04 : 0.9 + Math.min(state.combo, 8) * 0.04;
  try { playThud(pitchMult); } catch (e) { }
  state.combo = Math.min(state.combo + 1, 8);
  let pts;
  if (type === 'purpality') {
    const streak = state.combo >= 3;
    pts = streak ? Math.round(100 * 2.5) : 100;
  } else {
    pts = 10 * state.combo;
  }
  state.roundScore += pts;
  state.totalScore += pts;
  setScoreValue(state.roundScore);
  setComboValue('×' + state.combo);
  ptsEl.textContent = '+' + pts;
  if (type === 'purpality') ptsEl.style.color = 'rgba(180,100,255,0.95)';
  ptsEl.classList.add('show');
  setTimeout(() => { ptsEl.style.color = ''; }, 600);
  const tag = type === 'purpality' ? '' : state.combo >= 5 ? 'unstoppable' : state.combo >= 3 ? 'combo ×' + state.combo : '';
  msgEl.textContent = tag;
}

export function getRound1DebugInfo() {
  const round = ROUNDS[state.currentRound];
  return {
    spawnIntervalMs: round ? round.speed : null,
    maxAlive: round ? round.max : null,
    molesAlive: state.moles.filter(m => m.alive).length,
    running: state.running
  };
}

export function spawnLoop() {
  if (!state.running) return;
  state.moles = state.moles.filter(m => m.alive);
  spawnMole();
  const round = ROUNDS[state.currentRound];
  state.gTimer = setTimeout(spawnLoop, round.speed * 0.45 + Math.random() * round.speed * 0.4);
}

export function startRound1() {
  state.running = true;
  state.roundScore = 0;
  state.combo = 1;
  state.misses = 0;
  state.moles = [];
  state.timeLeft = ROUNDS[0].duration;
  spawnLoop();
  
  // Timer countdown
  const timerFunc = () => {
    state.timeLeft--;
    if (state.timeLeft <= 0) {
      state.running = false;
      clearTimeout(state.gTimer);
      state.bTimer = null;
      // Round 1 complete, move to next
      setTimeout(() => startRound(1), 1500);
    } else {
      state.bTimer = setTimeout(timerFunc, 1000);
    }
  };
  state.bTimer = setTimeout(timerFunc, 1000);
}

export function endRound1() {
  state.running = false;
  clearTimeout(state.gTimer);
  if (state.bTimer) clearTimeout(state.bTimer);
  state.bTimer = null;
  state.moles.forEach(m => {
    if (m.alive) {
      m.alive = false;
      clearTimeout(m.timer);
      m.el.remove();
    }
  });
  state.moles = [];
}
