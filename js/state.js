// Shared Game State - This module provides global game state
//
// IMPORTANT: this is exported as ONE mutable object (`state`), not as a set
// of individual named exports. Other modules import it with
// `import { state } from './state.js'` and read/write fields on it, e.g.
// `state.currentRound = 1`. Individual named exports (the old approach)
// cannot be reassigned from an importing file — only the object-wrapper
// pattern below allows other modules to actually update these values.

// ── AUDIO (fixed values, computed once) ──
const BGM_URL = './the true citadel.mp3';
const THUD_URL = './thud sfx, 1st iteration.mp3';
const bgmAudio = new Audio(BGM_URL);
bgmAudio.loop = true;
bgmAudio.volume = 0.5;

// ── THE SHARED, MUTABLE STATE OBJECT ──
const state = {
  // ── ROUND / SCORE ──
  currentRound: 0,
  roundScore: 0,
  totalScore: 0,
  misses: 0,
  combo: 1,
  running: false,

  // ── TIMERS ──
  moles: [], gTimer: null, bTimer: null, timeLeft: 0,
  bgmStarted: false,

  // ── AUDIO ──
  BGM_URL, THUD_URL, bgmAudio,
  audioCtx: null,
  sfxMuted: false,
  sfxVolScale: 0.8,
  thudBuffer: null, thudReversedBuffer: null,

  // ── DUEL ROUND STATE ──
  duelPlayerHP: undefined, duelEnemyHP: undefined,
  duelPlayerChoice: null,
  duelPhase: 'choose', // choose | reveal | locked
  duelRaf: null,
  duelParticles: [],
  duelPlayerTrails: [],
  duelShake: 0,
  duelEntityPhase: 0,
  duelAnimState: {player: {anim: null, frame: 0, action: null}, enemy: {anim: null, frame: 0, action: null}},
  duelVoidTrails: [],
};

export { state };
