// Dev Panel — hidden debug/testing panel.
// Opened with Shift+D, gated behind a password, closed with Escape or the
// close button. Lets you jump straight to any round, jump to the portal
// screen, and tweak/mute BGM & SFX while testing.
import { state } from './state.js';
import { field, welcomeScreen, portalScreen, gameScreen, glitchTrans, roundOverlay } from './ui.js';
import { stopInvaders } from './rounds/round2.js';
import { stopDuel } from './rounds/round3.js';
import { startRound, showPortal } from './game.js';

const DEV_PASSWORD = '1221';

let devPanel, devPwInput, devPwError, devControls;
let devBgmVol, devBgmVolVal, devSfxVol, devSfxVolVal, devBgmToggle, devSfxToggle, devBgmRestart;
let shiftHeld = false;

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
}
