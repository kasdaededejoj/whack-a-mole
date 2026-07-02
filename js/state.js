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

// ── INVADER ROUND CONFIG (fixed values, computed once) ──
const INV_GLYPHS_W1 = ['⌖', '⊕', '⊗', '◈', '⌬', '⍟', '⎔', '⊞'];
const INV_GLYPHS_W2 = ['⌘', '⍜', '⌂', '⍝', '⌇', '⍣', '⌾', '⍤'];
const INV_GLYPHS_W3 = ['⌁', '⍯', '⌀', '⍬', '⌃', '⍮', '⌤', '⍭'];
const INV_GLYPHS_W4 = ['⎎', '⍫', '⎍', '⍪', '⎌', '⍩', '⎋', '⍨'];
const INV_GLYPHS_W5 = ['⍧', '⍦', '⍥', '⍤', '⍣', '⍢', '⍡', '⍠'];
const INV_GLYPH_SETS = [INV_GLYPHS_W1, INV_GLYPHS_W2, INV_GLYPHS_W3, INV_GLYPHS_W4, INV_GLYPHS_W5];

const INV_WAVE_CONFIG = [
  {cols: 8, rows: 4, descentSpeed: 0.12, hpTop: 2, hpRest: 1},
  {cols: 8, rows: 4, descentSpeed: 0.18, hpTop: 2, hpRest: 1},
  {cols: 9, rows: 4, descentSpeed: 0.26, hpTop: 3, hpRest: 1},
  {cols: 9, rows: 5, descentSpeed: 0.35, hpTop: 3, hpRest: 2},
  {cols: 10, rows: 5, descentSpeed: 0.48, hpTop: 4, hpRest: 2},
  null,
];

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

  // ── INVADER ROUND STATE ──
  invCanvas: null, invCtx: null, invRaf: null,
  invEntities: [], invBullets: [], invParticles: [],
  invShooterX: 0, invDescentY: 0, invMouseDown: false, invFireInterval: null,
  INV_BULLET_SPEED: 7, INV_FIRE_RATE: 120,
  INV_GLYPHS_W1, INV_GLYPHS_W2, INV_GLYPHS_W3, INV_GLYPHS_W4, INV_GLYPHS_W5,
  INV_GLYPH_SETS, INV_WAVE_CONFIG, INV_BOSS_HP: 313,
  invWave: 0,
  invTransitioning: false,
  invUpgrade: null,
  invAoeCooldown: 0,
  INV_AOE_INTERVAL: 2500, INV_AOE_RADIUS: 40,
  invNukaCooldownUntil: 0,
  invNukaSkillActive: false,
  invNukaPromptLetter: '',
  invNukaCooldownTimer: null,
  invNukaCooldownRaf: null,
  invMessageTimer: null,

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
