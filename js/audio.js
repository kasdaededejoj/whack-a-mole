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

export { reverseBuffer, getAudio, preloadThud, playThud, playMiss, initAudio };
