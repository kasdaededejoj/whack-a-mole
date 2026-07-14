// UI and HUD Management
import { state } from './state.js';

// DOM references - lazy-loaded to ensure DOM is ready
let field, scoreEl, missEl, comboEl, msgEl, failOverlay, failMsgText, hudEl;
let barEl, roundOverlay, roundText, gameScreen, welcomeScreen;
let portalScreen, portalTimer, glitchTrans, portalQR, duelScreen;

function initDOMRefs() {
  field = document.getElementById('field');
  hudEl = document.querySelector('.hud');
  scoreEl = document.getElementById('score');
  missEl = document.getElementById('misses');
  comboEl = document.getElementById('combo');
  msgEl = document.getElementById('msg');
  failOverlay = document.getElementById('fail-overlay');
  failMsgText = document.getElementById('fail-msg-text');
  barEl = document.getElementById('bar');
  roundOverlay = document.getElementById('round-overlay');
  roundText = document.getElementById('round-text');
  gameScreen = document.getElementById('game-screen');
  welcomeScreen = document.getElementById('welcome-screen');
  portalScreen = document.getElementById('portal-screen');
  portalTimer = document.getElementById('portal-timer');
  glitchTrans = document.getElementById('glitch-transition');
  portalQR = document.getElementById('portal-qr');
  duelScreen = document.getElementById('duel-screen');
}

const ROUND_FAIL = [
  'miss thrice, you\'re cursed.',
  'overwhelmed—invasors descend.',
  'your void, turned against you.'
];

function setScoreValue(value) {
  scoreEl.textContent = value;
  scoreEl.classList.add('fade-value');
  window.clearTimeout(scoreEl._hudFadeTimer);
  scoreEl._hudFadeTimer = setTimeout(() => scoreEl.classList.remove('fade-value'), 180);
}

function setComboValue(value) {
  comboEl.textContent = value;
  comboEl.classList.add('combo-pulse');
  window.clearTimeout(comboEl._hudPulseTimer);
  comboEl._hudPulseTimer = setTimeout(() => comboEl.classList.remove('combo-pulse'), 180);

  // Tonal heat ramp — mirrors the same 3/5 combo thresholds already used
  // for "combo ×N" / "unstoppable" messaging in round1.js and round2.js.
  const n = parseInt(String(value).replace(/[^\d]/g, ''), 10) || 1;
  const tier = n >= 5 ? 'heat-2' : n >= 3 ? 'heat-1' : '';
  hudEl?.classList.remove('heat-1', 'heat-2');
  if (tier) hudEl?.classList.add(tier);
}

function setMissesValue(value) {
  missEl.textContent = value;
  missEl.classList.add('miss-pulse');
  window.clearTimeout(missEl._hudPulseTimer);
  missEl._hudPulseTimer = setTimeout(() => missEl.classList.remove('miss-pulse'), 220);
}

function showHudActive() {
  const hud = document.querySelector('.hud');
  hud?.classList.add('active-opacity');
}

function showFail(roundIdx) {
  // Tear down game state visually
  gameScreen.classList.remove('active');
  if (typeof duelScreen !== 'undefined') duelScreen?.classList.remove('active');
  // Reset fail msg animation
  failMsgText.style.animation = 'none';
  failMsgText.innerHTML = ROUND_FAIL[roundIdx];
  void failMsgText.offsetWidth;
  failMsgText.style.animation = 'fadeUp .8s ease both .2s';
  failOverlay.classList.add('active');
  state.totalScore = 0;
  // Brief pause then reroute to welcome
  setTimeout(() => {
    failOverlay.classList.remove('active');
    state.currentRound = 0;
    // Re-trigger welcome animations
    const wm = document.querySelector('.welcome-msg');
    const ws = document.querySelector('.welcome-sub');
    const wb = document.getElementById('ok-btn');
    [wm, ws, wb].forEach(el => { el.style.animation = 'none'; void el.offsetWidth; });
    wm.style.animation = 'fadeDown .9s ease both .3s';
    ws.style.animation = 'fadeUp .9s ease both .8s';
    wb.style.animation = 'btnFadeUp .9s ease both .3s';
    welcomeScreen.classList.add('active');
  }, 2800);
}

export { 
  field, scoreEl, missEl, comboEl, msgEl, failOverlay, failMsgText,
  barEl, roundOverlay, roundText, gameScreen, welcomeScreen,
  portalScreen, portalTimer, glitchTrans, portalQR, duelScreen,
  initDOMRefs,
  setScoreValue, setComboValue, setMissesValue, showHudActive, showFail
};
