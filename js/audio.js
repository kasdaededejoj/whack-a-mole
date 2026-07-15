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

// Player takes damage — 5 semitones down from ~207Hz base = ~155Hz
// Heavy lowpass + sub-bass oscillator at 40Hz for infrasonic feel
function playPlayerDamage() {
  if (state.sfxMuted) return;
  try {
    const ctx = getAudio();
    const now = ctx.currentTime;

    // Layer 1: lowpass noise burst — bandpass centred at 155Hz (207 * 2^(-5/12))
    const bufLen = Math.floor(ctx.sampleRate * 0.45);
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 0.5);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 80; // heavy low emphasis
    lp.Q.value = 2.5;
    const g1 = ctx.createGain();
    g1.gain.setValueAtTime(0.6 * state.sfxVolScale, now);
    g1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    src.connect(lp); lp.connect(g1); g1.connect(ctx.destination);
    src.start(now); src.stop(now + 0.5);

    // Layer 2: sub-bass oscillator at 40Hz — infrasonic rumble
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(40, now);
    sub.frequency.exponentialRampToValueAtTime(25, now + 0.4);
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.001, now);
    g2.gain.linearRampToValueAtTime(0.45 * state.sfxVolScale, now + 0.04);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    sub.connect(g2); g2.connect(ctx.destination);
    sub.start(now); sub.stop(now + 0.45);

    // Layer 3: pitched thud at 155Hz — the 5-semitone-down hit body
    const thud = ctx.createOscillator();
    thud.type = 'triangle';
    thud.frequency.setValueAtTime(155, now);
    thud.frequency.exponentialRampToValueAtTime(60, now + 0.18);
    const g3 = ctx.createGain();
    g3.gain.setValueAtTime(0.3 * state.sfxVolScale, now);
    g3.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    thud.connect(g3); g3.connect(ctx.destination);
    thud.start(now); thud.stop(now + 0.22);
    // Layer 4: echo — delayed repeat of the thud at 120ms, half gain
    const echo = ctx.createOscillator();
    echo.type = 'triangle';
    echo.frequency.setValueAtTime(155, now + 0.12);
    echo.frequency.exponentialRampToValueAtTime(60, now + 0.30);
    const g4 = ctx.createGain();
    g4.gain.setValueAtTime(0.001, now + 0.12);
    g4.gain.linearRampToValueAtTime(0.15 * state.sfxVolScale, now + 0.14);
    g4.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    echo.connect(g4); g4.connect(ctx.destination);
    echo.start(now + 0.12); echo.stop(now + 0.32);
  } catch(e) {}
}

// Boss wave cast — infrasonic sweep + sub-bass descent + void rumble + attack transient
function playBossWaveCast() {
  if (state.sfxMuted) return;
  try {
    const ctx = getAudio();
    const now = ctx.currentTime;

    // Layer 1 — infrasonic sweep: 28Hz → 14Hz over 0.8s (felt as pressure, sub-threshold)
    const infra = ctx.createOscillator();
    infra.type = 'sine';
    infra.frequency.setValueAtTime(28, now);
    infra.frequency.exponentialRampToValueAtTime(14, now + 0.8);
    const gi = ctx.createGain();
    gi.gain.setValueAtTime(0.001, now);
    gi.gain.linearRampToValueAtTime(0.7 * state.sfxVolScale, now + 0.12);
    gi.gain.setValueAtTime(0.7 * state.sfxVolScale, now + 0.5);
    gi.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
    infra.connect(gi); gi.connect(ctx.destination);
    infra.start(now); infra.stop(now + 0.85);

    // Layer 2 — sub-bass octave descent: sawtooth 55Hz → 32Hz, heavy lowpass
    const sub = ctx.createOscillator();
    sub.type = 'sawtooth';
    sub.frequency.setValueAtTime(55, now);
    sub.frequency.exponentialRampToValueAtTime(32, now + 0.65);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 90;
    lp.Q.value = 1.8;
    const gs = ctx.createGain();
    gs.gain.setValueAtTime(0.001, now);
    gs.gain.linearRampToValueAtTime(0.5 * state.sfxVolScale, now + 0.08);
    gs.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    sub.connect(lp); lp.connect(gs); gs.connect(ctx.destination);
    sub.start(now); sub.stop(now + 0.7);

    // Layer 3 — void rumble: bandpass noise at 120Hz
    const bufLen = Math.floor(ctx.sampleRate * 0.75);
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 0.4);
    }
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 120;
    bp.Q.value = 0.8;
    const gn = ctx.createGain();
    gn.gain.setValueAtTime(0.35 * state.sfxVolScale, now);
    gn.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
    noiseSrc.connect(bp); bp.connect(gn); gn.connect(ctx.destination);
    noiseSrc.start(now); noiseSrc.stop(now + 0.75);

    // Layer 4 — attack transient: triangle click at 180Hz, 60ms decay
    const click = ctx.createOscillator();
    click.type = 'triangle';
    click.frequency.setValueAtTime(180, now);
    click.frequency.exponentialRampToValueAtTime(60, now + 0.06);
    const gc = ctx.createGain();
    gc.gain.setValueAtTime(0.4 * state.sfxVolScale, now);
    gc.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    click.connect(gc); gc.connect(ctx.destination);
    click.start(now); click.stop(now + 0.06);
  } catch(e) {}
}

// Dua beam charge — rising sweep on mousedown
function playDuaBeamCharge() {
  if (state.sfxMuted) return;
  try {
    const ctx = getAudio();
    const now = ctx.currentTime;

    // Layer 1: sawtooth sweep 180→720Hz over 0.4s — the charge-up whine
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(720, now + 0.4);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.18 * state.sfxVolScale, now + 0.08);
    g.gain.setValueAtTime(0.18 * state.sfxVolScale, now + 0.32);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(now); osc.stop(now + 0.45);

    // Layer 2: bandpass noise underneath for body
    const bufLen = Math.floor(ctx.sampleRate * 0.45);
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 0.6);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 600; bp.Q.value = 1.4;
    const gn = ctx.createGain();
    gn.gain.setValueAtTime(0.001, now);
    gn.gain.linearRampToValueAtTime(0.12 * state.sfxVolScale, now + 0.1);
    gn.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    src.connect(bp); bp.connect(gn); gn.connect(ctx.destination);
    src.start(now); src.stop(now + 0.45);
  } catch(e) {}
}

// Dua beam fire — sustained laser with variation + grain degradation
// _duaBeamShotCount tracks consecutive shots for degradation; reset externally on mouseup
let _duaBeamShotCount = 0;
function resetDuaBeamDegradation() { _duaBeamShotCount = 0; }
function playDuaBeamFire() {
  if (state.sfxMuted) return;
  try {
    const ctx = getAudio();
    const now = ctx.currentTime;
    const deg = Math.min(_duaBeamShotCount, 6); // 0–6 degradation steps
    _duaBeamShotCount++;

    // Layer 1: core laser tone — sawtooth with slow LFO pitch drift
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    // Base pitch drifts slightly each shot via degradation
    const basePitch = 280 + deg * 12;
    osc.frequency.setValueAtTime(basePitch, now);
    // Slow pitch wobble — laser shimmer
    osc.frequency.linearRampToValueAtTime(basePitch * 1.04, now + 0.12);
    osc.frequency.linearRampToValueAtTime(basePitch * 0.97, now + 0.28);
    osc.frequency.linearRampToValueAtTime(basePitch * 1.02, now + 0.42);
    const lp = ctx.createBiquadFilter();
    lp.type = 'bandpass'; lp.frequency.value = 900 + deg * 40; lp.Q.value = 1.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.22 * state.sfxVolScale, now + 0.03);
    // LFO amplitude variation — 4Hz modulation
    g.gain.setValueAtTime(0.22 * state.sfxVolScale, now + 0.03);
    g.gain.linearRampToValueAtTime(0.16 * state.sfxVolScale, now + 0.15);
    g.gain.linearRampToValueAtTime(0.22 * state.sfxVolScale, now + 0.28);
    g.gain.linearRampToValueAtTime(0.14 * state.sfxVolScale, now + 0.40);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.44);
    osc.connect(lp); lp.connect(g); g.connect(ctx.destination);
    osc.start(now); osc.stop(now + 0.44);

    // Layer 2: grain noise — increases with degradation
    const grainAmt = 0.06 + deg * 0.04; // 0.06 → 0.30 over 6 shots
    const bufLen = Math.floor(ctx.sampleRate * 0.44);
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      // Sparse grain bursts — random crackle character
      data[i] = Math.random() < 0.15 ? (Math.random() * 2 - 1) : (Math.random() * 2 - 1) * 0.1;
    }
    const nSrc = ctx.createBufferSource();
    nSrc.buffer = buf;
    const nhp = ctx.createBiquadFilter();
    nhp.type = 'highpass'; nhp.frequency.value = 2000 + deg * 200; // grain gets harsher
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(grainAmt * state.sfxVolScale, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.44);
    nSrc.connect(nhp); nhp.connect(ng); ng.connect(ctx.destination);
    nSrc.start(now); nSrc.stop(now + 0.44);
  } catch(e) {}
}

export { reverseBuffer, getAudio, preloadThud, playThud, playMiss, initAudio,
  playBulletFire, playMissileFire, playEnemyDeath, playWaveClear,
  playUpgradePick, playAoeTrigger, playMachinaBurst, playNukaActivate, playNukaSuccess,
  playPlayerDamage, playBossWaveCast,
  playDuaBeamCharge, playDuaBeamFire, resetDuaBeamDegradation };
