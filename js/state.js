// Shared Game State - This module provides global game state
// Export as properties so they can be imported and modified across modules

let currentRound = 0;
let roundScore = 0;
let totalScore = 0;
let misses = 0, combo = 1, running = false;

// ── TIMERS ──
let moles = [], gTimer = null, bTimer = null, timeLeft = 0;
let bgmStarted = false;

// ── AUDIO ──
const BGM_URL = './the true citadel.mp3';
const THUD_URL = './thud sfx, 1st iteration.mp3';
const bgmAudio = new Audio(BGM_URL);
bgmAudio.loop = true;
bgmAudio.volume = 0.5;

let audioCtx = null;
let sfxMuted = false;
let sfxVolScale = 0.8;
let thudBuffer = null, thudReversedBuffer = null;

// ── INVADER ROUND STATE ──
let invCanvas = null, invCtx = null, invRaf = null;
let invEntities = [], invBullets = [], invParticles = [];
let invShooterX = 0, invDescentY = 0, invMouseDown = false, invFireInterval = null;
const INV_BULLET_SPEED = 7, INV_FIRE_RATE = 120;

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
const INV_BOSS_HP = 313;

let invWave = 0;
let invTransitioning = false;
let invUpgrade = null;
let invAoeCooldown = 0;
const INV_AOE_INTERVAL = 2500, INV_AOE_RADIUS = 40;
let invNukaCooldownUntil = 0;
let invNukaSkillActive = false;
let invNukaPromptLetter = '';
let invNukaCooldownTimer = null;
let invNukaCooldownRaf = null;
let invMessageTimer = null;

// ── DUEL ROUND STATE ──
let duelPlayerHP, duelEnemyHP;
let duelPlayerChoice = null;
let duelPhase = 'choose'; // choose | reveal | locked
let duelRaf = null;
let duelParticles = [];
let duelPlayerTrails = [];
let duelShake = 0;
let duelEntityPhase = 0;
let duelAnimState = {player: {anim: null, frame: 0, action: null}, enemy: {anim: null, frame: 0, action: null}};
let duelVoidTrails = [];

export {
  currentRound, roundScore, totalScore, misses, combo, running,
  moles, gTimer, bTimer, timeLeft, bgmStarted,
  BGM_URL, THUD_URL, bgmAudio, audioCtx, sfxMuted, sfxVolScale,
  thudBuffer, thudReversedBuffer,
  invCanvas, invCtx, invRaf, invEntities, invBullets, invParticles,
  invShooterX, invDescentY, invMouseDown, invFireInterval,
  INV_BULLET_SPEED, INV_FIRE_RATE,
  INV_GLYPHS_W1, INV_GLYPHS_W2, INV_GLYPHS_W3, INV_GLYPHS_W4, INV_GLYPHS_W5,
  INV_GLYPH_SETS, INV_WAVE_CONFIG, INV_BOSS_HP,
  invWave, invTransitioning, invUpgrade, invAoeCooldown,
  INV_AOE_INTERVAL, INV_AOE_RADIUS, invNukaCooldownUntil, invNukaSkillActive,
  invNukaPromptLetter, invNukaCooldownTimer, invNukaCooldownRaf, invMessageTimer,
  duelPlayerHP, duelEnemyHP, duelPlayerChoice, duelPhase, duelRaf, duelParticles,
  duelPlayerTrails, duelShake, duelEntityPhase, duelAnimState, duelVoidTrails
};
