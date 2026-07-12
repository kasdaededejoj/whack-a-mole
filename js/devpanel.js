// Dev Panel — hidden debug/testing panel.
// Opened with Shift+D, gated behind a password, closed with Escape or the
// close button. Lets you jump straight to any round, jump to the portal
// screen, and tweak/mute BGM & SFX while testing.
import { state } from './state.js';
import { field, welcomeScreen, portalScreen, gameScreen, glitchTrans, roundOverlay } from './ui.js';
import { stopInvaders, resumeInvaders, getRound2DebugInfo } from './rounds/round2.js';
import { stopDuel, getRound3DebugInfo } from './rounds/round3.js';
import { getRound1DebugInfo } from './rounds/round1.js';
import { startRound, showPortal } from './game.js';

const DEV_PASSWORD = '1221';

let devPanel, devPwInput, devPwError, devControls;
let devBgmVol, devBgmVolVal, devSfxVol, devSfxVolVal, devBgmToggle, devSfxToggle, devBgmRestart;
let devLiveToggle, devLiveOverlay, devLiveInterval = null;
let shiftHeld = false;

function updateLiveOverlay() {
  let lines = [`round ${state.currentRound + 1} · running=${state.running}`];
  if (state.currentRound === 0) {
    const d = getRound1DebugInfo();
    lines.push(`spawn interval: ${d.spawnIntervalMs}ms`, `max alive: ${d.maxAlive}`, `moles alive: ${d.molesAlive}`);
  } else if (state.currentRound === 1) {
    const d = getRound2DebugInfo();
    lines.push(
      `wave: ${d.wave}${d.isBossWave ? ' (boss)' : ''}`,
      `descent speed: ${d.descentSpeed}`,
      `bullet speed: base=${d.baseBulletSpeed} effective=${d.effectiveBulletSpeed.toFixed(2)}`,
      `nuka bullet speed: ${d.nukaBulletSpeed.toFixed(2)}`,
      `upgrade: ${d.upgrade || 'none'}`,
      `render loop alive: ${d.invRafAlive}`
    );
  } else if (state.currentRound === 2) {
    const d = getRound3DebugInfo();
    lines.push(`player hp: ${d.playerHP}`, `enemy hp: ${d.enemyHP}`, `phase: ${d.phase}`);
  }
  devLiveOverlay.textContent = lines.join('\n');
}

function setLiveOverlay(on) {
  devLiveToggle.classList.toggle('on', on);
  devLiveToggle.textContent = on ? 'on' : 'off';
  devLiveOverlay.classList.toggle('active', on);
  if (on) {
    if (devLiveInterval) clearInterval(devLiveInterval);
    devLiveInterval = setInterval(updateLiveOverlay, 200);
    updateLiveOverlay();
  } else if (devLiveInterval) {
    clearInterval(devLiveInterval);
    devLiveInterval = null;
  }
}

function openDevPanel() {
  // Pause running game if mid-round
  if (state.running) {
    state.running = false;
    clearTimeout(state.gTimer);
    clearInterval(state.bTimer);
  }
  devPanel.classList.add('open');
  devPwInput.value = '';
  devPwError.textContent = '';
  devControls.classList.remove('unlocked');
  setTimeout(() => devPwInput.focus(), 80);
}

function closeDevPanel() {
  devPanel.classList.remove('open');
  devPwInput.value = '';
  devPwError.textContent = '';
  // Resume game if it was paused by opening the panel
  if(!state.running && typeof resumeInvaders === 'function'){
    resumeInvaders();
  } else if(!state.running){
    state.running = true;
  }
}

function checkDevPassword() {
  if (devPwInput.value === DEV_PASSWORD) {
    devPwError.textContent = '';
    devControls.classList.add('unlocked');
    devPwInput.style.display = 'none';
    document.getElementById('dev-pw-submit').style.display = 'none';
  } else {
    devPwError.textContent = 'denied.';
    devPwInput.value = '';
  }
}

// Shared teardown used by both "jump to round" and "jump to portal"
function teardownRunning() {
  state.running = false;
  clearTimeout(state.gTimer);
  clearInterval(state.bTimer);
  stopInvaders();
  stopDuel();
  state.moles.forEach(m => {
    if (m.alive) {
      clearTimeout(m.timer);
      try { m.el.remove(); } catch (e) {}
    }
  });
  state.moles = [];
  field.innerHTML = '';
}

function devJumpToRound(idx) {
  closeDevPanel();
  teardownRunning();
  welcomeScreen.classList.remove('active');
  portalScreen.classList.remove('active');
  gameScreen.classList.remove('active');
  glitchTrans.classList.remove('active');
  roundOverlay.classList.remove('show');
  // Reset scores so thresholds are reachable but don't break total
  state.roundScore = 0;
  state.misses = 0;
  state.combo = 1;
  devPwInput.style.display = '';
  document.getElementById('dev-pw-submit').style.display = '';
  startRound(idx);
}

function devJumpToPortal() {
  closeDevPanel();
  teardownRunning();
  welcomeScreen.classList.remove('active');
  gameScreen.classList.remove('active');
  devPwInput.style.display = '';
  showPortal();
}

export function initDevPanel() {
  devPanel = document.getElementById('dev-panel');
  devPwInput = document.getElementById('dev-pw-input');
  devPwError = document.getElementById('dev-pw-error');
  devControls = document.getElementById('dev-controls');
  devBgmVol = document.getElementById('dev-bgm-vol');
  devBgmVolVal = document.getElementById('dev-bgm-vol-val');
  devSfxVol = document.getElementById('dev-sfx-vol');
  devSfxVolVal = document.getElementById('dev-sfx-vol-val');
  devBgmToggle = document.getElementById('dev-bgm-toggle');
  devSfxToggle = document.getElementById('dev-sfx-toggle');
  devBgmRestart = document.getElementById('dev-bgm-restart');
  devLiveToggle = document.getElementById('dev-live-toggle');
  devLiveOverlay = document.getElementById('dev-live-overlay');

  // ── Shift+D to open, Escape to close ──
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Shift') shiftHeld = true;
    if (shiftHeld && e.code === 'KeyD') openDevPanel();
    if (e.key === 'Escape' && devPanel.classList.contains('open')) closeDevPanel();
  });
  document.addEventListener('keyup', (e) => {
    if (e.key === 'Shift') shiftHeld = false;
  });

  // ── Password gate ──
  devPwInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') checkDevPassword(); });
  devPwInput.addEventListener('input', () => { devPwError.textContent = ''; });
  document.getElementById('dev-pw-submit').addEventListener('click', checkDevPassword);

  // ── Round jump / portal jump / close ──
  document.getElementById('dev-r0').addEventListener('click', () => devJumpToRound(0));
  document.getElementById('dev-r1').addEventListener('click', () => devJumpToRound(1));
  document.getElementById('dev-r2').addEventListener('click', () => devJumpToRound(2));
  document.getElementById('dev-portal').addEventListener('click', devJumpToPortal);
  document.getElementById('dev-close').addEventListener('click', closeDevPanel);

  // ── Audio debug controls ──
  devBgmVol.addEventListener('input', () => {
    const v = parseInt(devBgmVol.value) / 100;
    devBgmVolVal.textContent = devBgmVol.value;
    state.bgmAudio.volume = v;
  });
  devSfxVol.addEventListener('input', () => {
    state.sfxVolScale = parseInt(devSfxVol.value) / 100;
    devSfxVolVal.textContent = devSfxVol.value;
  });
  devBgmToggle.addEventListener('click', () => {
    const on = devBgmToggle.classList.toggle('on');
    devBgmToggle.textContent = on ? 'on' : 'off';
    if (on) { state.bgmAudio.play().catch(e => {}); }
    else { state.bgmAudio.pause(); }
  });
  devSfxToggle.addEventListener('click', () => {
    const on = devSfxToggle.classList.toggle('on');
    devSfxToggle.textContent = on ? 'on' : 'off';
    state.sfxMuted = !on;
  });
  devBgmRestart.addEventListener('click', () => {
    state.bgmAudio.currentTime = 0;
    state.bgmAudio.volume = parseInt(devBgmVol.value) / 100;
    state.bgmAudio.play().catch(e => {});
    devBgmToggle.classList.add('on');
    devBgmToggle.textContent = 'on';
  });

  // ── Live state overlay (does NOT pause the game, unlike opening this panel) ──
  devLiveToggle.addEventListener('click', () => {
    setLiveOverlay(!devLiveToggle.classList.contains('on'));
  });
}
