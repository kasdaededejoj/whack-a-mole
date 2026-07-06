// Audio System
import { state } from './state.js';

function reverseBuffer(ctx, buffer) {
  const reversed = ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const fwd = buffer.getChannelData(ch);
    const rev = reversed.getChannelData(ch);
    for (let i = 0; i < buffer.length; i++) rev[i] = fwd[buffer.length - 1 - i];
  }
  return reversed;
}

function getAudio() {
  if (!state.audioCtx) state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (state.audioCtx.state === 'suspended') state.audioCtx.resume().catch(e => {});
  return state.audioCtx;
}

function preloadThud() {
  try {
    const ctx = getAudio();
    fetch(state.THUD_URL)
      .then(r => r.arrayBuffer())
      .then(ab => ctx.decodeAudioData(ab))
      .then(buf => {
        state.thudBuffer = buf;
        state.thudReversedBuffer = reverseBuffer(ctx, buf);
      })
      .catch(e => {});
  } catch (e) {}
}

function playThud(pitch = 1) {
  if (state.sfxMuted) return;
  try {
    if (state.thudBuffer) {
      const ctx = getAudio();
      const src = ctx.createBufferSource();
      src.buffer = state.thudBuffer;
      src.playbackRate.value = pitch;
      const g = ctx.createGain();
      g.gain.value = 0.9 * state.sfxVolScale;
      src.connect(g);
      g.connect(ctx.destination);
      src.start();
    }
  } catch (e) {}
}

function playMiss() {
  if (state.sfxMuted) return;
  try {
    if (state.thudReversedBuffer) {
      const ctx = getAudio();
      const src = ctx.createBufferSource();
      src.buffer = state.thudReversedBuffer;
      src.playbackRate.value = 1;
      const g = ctx.createGain();
      g.gain.value = 0.1 * state.sfxVolScale;
      src.connect(g);
      g.connect(ctx.destination);
      src.start();
    }
  } catch (e) {}
}

function initAudio() {
  if (state.bgmStarted) return;
  state.bgmStarted = true;
  document.removeEventListener('click', initAudio);
  document.removeEventListener('touchstart', initAudio);
  try {
    preloadThud();
    getAudio().resume();
    state.bgmAudio.volume = 0;
    state.bgmAudio.play().catch(e => {});
    const fadeSteps = 60, fadeTarget = 0.5, fadeDuration = 6000;
    const stepTime = fadeDuration / fadeSteps;
    const stepSize = fadeTarget / fadeSteps;
    let step = 0;
    const fadeInterval = setInterval(() => {
      step++;
      state.bgmAudio.volume = Math.min(fadeTarget, step * stepSize);
      if (step >= fadeSteps) clearInterval(fadeInterval);
    }, stepTime);
  } catch (e) {}
}

// — Round 2 procedural SFX —

// Short high snap on bullet fire
function playBulletFire() {
  if (state.sfxMuted) return;
  try {
    const ctx = getAudio();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(900, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.06);
    g.gain.setValueAtTime(0.18 * state.sfxVolScale, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.07);
  } catch(e) {}
}

// Missile fire — deeper, longer
function playMissileFire() {
  if (state.sfxMuted) return;
  try {
    const ctx = getAudio();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.14);
    g.gain.setValueAtTime(0.22 * state.sfxVolScale, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.15);
  } catch(e) {}
}

// Enemy death — short low thud with pitch scatter
function playEnemyDeath(pitchMult = 1) {
  if (state.sfxMuted) return;
  try {
    const ctx = getAudio();
    const bufLen = Math.floor(ctx.sampleRate * 0.08);
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufLen);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 180 * pitchMult;
    filter.Q.value = 1.2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.35 * state.sfxVolScale, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    src.connect(filter); filter.connect(g); g.connect(ctx.destination);
    src.start(); src.stop(ctx.currentTime + 0.1);
  } catch(e) {}
}

// Wave clear — rising tone sweep
function playWaveClear() {
  if (state.sfxMuted) return;
  try {
    const ctx = getAudio();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.35);
    g.gain.setValueAtTime(0.28 * state.sfxVolScale, ctx.currentTime);
    g.gain.setValueAtTime(0.28 * state.sfxVolScale, ctx.currentTime + 0.25);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.45);
  } catch(e) {}
}

// Upgrade picked — crisp confirm tone
function playUpgradePick() {
  if (state.sfxMuted) return;
  try {
    const ctx = getAudio();
    [0, 0.08, 0.16].forEach((offset, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = [520, 660, 880][i];
      g.gain.setValueAtTime(0.2 * state.sfxVolScale, ctx.currentTime + offset);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.12);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.12);
    });
  } catch(e) {}
}

// AOE ability — wide low boom
function playAoeTrigger() {
  if (state.sfxMuted) return;
  try {
    const ctx = getAudio();
    const bufLen = Math.floor(ctx.sampleRate * 0.25);
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 1.5);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 140;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.5 * state.sfxVolScale, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
    src.connect(filter); filter.connect(g); g.connect(ctx.destination);
    src.start(); src.stop(ctx.currentTime + 0.28);
  } catch(e) {}
}

// Machina burst — rapid metallic stutter
function playMachinaBurst() {
  if (state.sfxMuted) return;
  try {
    const ctx = getAudio();
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = 600 + i * 80;
      const t = ctx.currentTime + i * 0.04;
      g.gain.setValueAtTime(0.14 * state.sfxVolScale, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.05);
    }
  } catch(e) {}
}

// Nuka activate — eerie rising charge
function playNukaActivate() {
  if (state.sfxMuted) return;
  try {
    const ctx = getAudio();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5);
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.22 * state.sfxVolScale, ctx.currentTime + 0.3);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.55);
  } catch(e) {}
}

// Nuka resolve success — heavy detonation
function playNukaSuccess() {
  if (state.sfxMuted) return;
  try {
    const ctx = getAudio();
    const bufLen = Math.floor(ctx.sampleRate * 0.4);
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 0.7);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.55 * state.sfxVolScale, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    src.connect(filter); filter.connect(g); g.connect(ctx.destination);
    src.start(); src.stop(ctx.currentTime + 0.45);
  } catch(e) {}
}

export { reverseBuffer, getAudio, preloadThud, playThud, playMiss, initAudio,
  playBulletFire, playMissileFire, playEnemyDeath, playWaveClear,
  playUpgradePick, playAoeTrigger, playMachinaBurst, playNukaActivate, playNukaSuccess };
