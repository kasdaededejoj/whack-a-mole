# Handover — The Realm

---

## round2: semic semi-cone VFX rewrite + ch2 bugfix — 2026-07-16

### Committed & pushed to `main` (`6cd9b4e`)
Scope: `js/rounds/round2.js` only.

**Semic VFX — semi-cone (replaces full-height amber beam):**
- `SEMIC_W_START` removed. `SEMIC_W_PEAK=57px` (~1.5cm). Symmetric ramp: 0→57px over 0–250ms, 57→0px over 250–500ms.
- Shape: triangle path — tip at shooter `(bx, ch2-105)`, mouth at grid top `(y=36)`. Width at any Y = `currentW * (tipY - y) / coneH`.
- `colorPhase` stored per-burst at fire time: `Math.floor((Date.now()/300)%3)` → 0=purple, 1=cyan, 2=amber. Cycles between bursts.
- Layer 1: outer glow cone (1.6× width), phased linear gradient tip→mouth, low alpha.
- Layer 2: inner core cone (0.55× width), near-white tinted by phase, high alpha.
- Layer 3: blurred edge strokes (`filter:blur(2px)`) along both cone sides.
- Layer 4: fractal noise — 10 jittered vertical segments per frame, seeded by `elapsed/16` (re-rolls every frame), X/Y constrained inside cone bounds.
- Layer 5: glitch strips — 35% chance per frame, 2 horizontal bars with ±5px X shift inside cone.
- Muzzle: radial glow at tip `(bx, ch2-105)`, radius `currentW*0.6`.

**Bug fixed — boss screen disappearing on semic fire:**
- Root cause: semic draw block was reading `ch2` from the `isBeam` block scope. When no beam particle was active, `ch2` was `undefined` → `NaN` coordinates → canvas error state → entire frame render stopped.
- Fix: `const ch2 = invCanvas.height;` declared independently inside the `isSemic` block.

### Open items
- Boss SFX: pincer and teleport still paused
- Wave VFX `playbackRate` sync: not yet done
- `???` combos: beam+rapidaaa mechanics TBD
- All boss-wave upgrade combos need live playtesting

---

## round2: dua beam 4-row VFX + SFX + wave background — 2026-07-16

### Committed & pushed to `main` (`09f7318`)
Scope: `js/rounds/round2.js` and `js/audio.js` only. `round1.js` and `round3.js` untouched.

**Dua beam VFX — 4-row height limit:**
- Hit logic untouched. VFX-only constraint: `_castAndFireBeam` computes `_beamTopOverride` when `bw>=200` (dua beam): `36 + Math.max(0, rows-4) * 44`. Uses `INV_WAVE_CONFIG[Math.min(invWave, length-2)]` for row count — safe across all wave values, skips null boss entry.
- Beam particle carries `beamTopOverride`; draw block reads `p.beamTopOverride||0` as `beamTop`. All `fillRect`/`moveTo`/`lineTo` calls that use `beamTop` constrained automatically.
- Wave 4 (5 rows) → `beamTop=80px`; waves 1–3 (4 rows) → `beamTop=36` (full grid, visually no change for regular beam).

**Dua beam SFX (`audio.js`):**
- `playDuaBeamCharge()`: fires on mousedown when dua beam active. Rising sawtooth 180→720Hz / 0.45s + bandpass noise at 600Hz underneath.
- `playDuaBeamFire()`: fires on first shot and each 450ms hold interval. Sawtooth core with slow LFO-style pitch wobble (linear ramps). Grain degradation layer: sparse highpass noise that increases in amplitude and harshness over consecutive shots (`_duaBeamShotCount` 0→6, gain 0.06→0.30, highpass 2000→3200Hz). Degradation gives a "beam wearing out" character on sustained fire.
- `resetDuaBeamDegradation()`: resets `_duaBeamShotCount=0`. Called on mouseup (both `invHandleMouseUp` call sites) and `stopInvaders()`.
- All three exported from `audio.js`, imported in `round2.js`.

**Wave background — black + purple orb system:**
- `_BG_BLACK` / `_BG_ORB` arrays: black base opacity `[0.15,0.25,0.40,0.55,0.65,0.70]` and orb opacity `[0.12,0.22,0.35,0.50,0.62,0.72]` across waves 0–5.
- `inv-bg` div injected before canvas (z-index 0) on `startInvaders`, removed on `stopInvaders`. Canvas z-index bumped to 1. `field.style.position='relative'` set if not already.
- CSS injected once to `<head>` (`#inv-bg-style`): 5 `@keyframes invOrbFloat0–4` with unique translate targets (organic drift, 9–14s, infinite alternate).
- 5 orb divs: `border-radius:50%`, `filter:blur(60px)`, `rgba(120,0,200,0.55)`, each with different position/size/animation duration.
- `_updateInvBg(wave)` called on `startInvaders` (wave 0) and inside `nextInvaderWave()` after `invWave++`.
- Boss wave (5): orbs scale to 1.35× via CSS transform.

### Open items
- Boss SFX: pincer and teleport still paused
- Wave VFX `playbackRate` sync: `animateVid()` sets position but never `v.playbackRate` — video plays at 1× regardless of travel distance
- `???` combos: beam+rapidaaa, rapida+dua beam mechanics TBD (needs design input before code)
- All boss-wave upgrade combos need live playtesting

---

## round2: dua beam VFX limit + SFX + wave background — 2026-07-16

### Committed & pushed to `main` (`09f7318`)
Scope: `js/rounds/round2.js` and `js/audio.js` only. `round1.js` and `round3.js` untouched.

**Dua beam VFX — 4-row height limit:**
- `_castAndFireBeam` computes `_beamTopOverride` when `bw>=200` (dua beam): `36 + Math.max(0, rows-4) * 44` — grid top plus rows above the bottom 4, from `INV_WAVE_CONFIG[Math.min(invWave, length-2)]`
- Beam particle carries `beamTopOverride`; draw block reads `p.beamTopOverride||0` as `beamTop`
- Hit logic untouched — VFX only, avoids prior row-filter bugs
- Wave 4 (5 rows) → `beamTop=80px`; waves 1–3 (4 rows) → `beamTop=36` (full grid, visually unchanged)

**Dua beam SFX (`audio.js`):**
- `playDuaBeamCharge()`: mousedown trigger. Rising sawtooth 180→720Hz / 0.4s + bandpass noise at 600Hz.
- `playDuaBeamFire()`: each 450ms hold interval. Sawtooth with LFO pitch wobble + grain degradation noise layer that gets harsher over consecutive shots (`_duaBeamShotCount` 0→6, gain 0.06→0.30, highpass 2000→3200Hz).
- `resetDuaBeamDegradation()`: resets count on mouseup and `stopInvaders()`.
- All three exported from `audio.js`, imported in `round2.js`.

**Wave background — black + purple orb system:**
- `_BG_BLACK/ORB` arrays: black opacity `[0.15,0.25,0.40,0.55,0.65,0.70]`, orb opacity `[0.12,0.22,0.35,0.50,0.62,0.72]` across waves 0–5.
- `inv-bg` div injected before canvas (z-index 0) on `startInvaders`, removed on `stopInvaders`. Canvas z-index bumped to 1.
- CSS injected once to `<head>` (`#inv-bg-style`): 5 `@keyframes invOrbFloat0–4`.
- 5 orb divs: `border-radius:50%`, `filter:blur(60px)`, `rgba(120,0,200,0.55)`, 9–14s alternate float animations.
- `_updateInvBg(wave)` called on start (wave 0) and each `nextInvaderWave()`.
- Boss wave: orbs scale to 1.35×.

### Open items
- Boss SFX: pincer and teleport still paused
- Wave VFX `playbackRate` sync: not yet done
- `???` combos: beam+rapidaaa, rapida+dua beam mechanics TBD
- All boss-wave upgrade combos need live playtesting

---

## [Antigravity] Round 3 — void unlock, heal removal, turn buffer — 2026-07-15

**Agent:** Antigravity (Google DeepMind). Scope strictly limited to `js/rounds/round3.js` and `index.html` (CSS only). Did not touch `round1.js`, `round2.js`, `game.js`, `state.js`, `audio.js`, or any Round 2 logic.

### Committed & pushed to `main` (`5baa2fc`, `7861d4d`)

* **void locked above 30% HP** (`round3.js`): `duelSetButtons()` now checks `duelPlayerHP <= ceil(DUEL_PLAYER_MAX * 0.3)` (≤2 HP out of 8) before enabling the void button. Re-evaluated on every turn start, so it unlocks dynamically mid-duel.
* **Heal mechanic removed** (`round3.js`): Deleted the guard-guard +1 HP recovery block entirely from `duelResolveBossTurn`. No healing in the duel anymore.
* **Turn buffer reduced to 1.5s** (`round3.js`): `setTimeout` between player action and boss turn reduced from 3000ms → 1500ms.
* **void button visual states** (`index.html` CSS only): `.void-locked` = dim red border + `⌀` glyph indicator. `.void-unlocked` = purple border + pulsing `voidPulse` glow animation signalling last-resort availability.

### Round 3 state as of this session
- Player HP: 8 max, boss HP: 16 max
- void unlocks at ≤2 player HP (30% of 8)
- No healing — all outcomes are pure damage or standoff
- Turn flow: player acts → 1.5s buffer → boss acts → 1.8s result display → repeat

---

## Round 1: click sync fix + session changes consolidated — 2026-07-15

### Committed to `main` (`bf26af2`) — single clean commit on top of `2e7e40c`

**Root cause of the click miss bug (web + mobile):**

1. **Dead element eating clicks (primary cause):** on mole expire, `mole.alive`
   was set false immediately but `el.remove()` was delayed 220ms. During that
   window the dead element sat in the DOM with full pointer-events, directly
   over the next spawn (max:1). Every click hit the dead element, `whack()`
   returned on `!mole.alive`, new mole got nothing. ~27% of lifespan silently
   broken. Fixed: `el.style.pointerEvents = 'none'` set immediately on all
   three exit paths — normal expire, noise expire, and whack.

2. **Hit area collapsed during spawn animation:** `scale(0)` was on `.mole-el`
   (outer). CSS `scale()` shrinks pointer-events hit area — at `scale(0)` the
   target is zero. The 7-frame `sonidoAppear` flicker runs ~110ms at near-zero
   scale. Fixed: moved `scale(0)` off the outer `.mole-el` onto `.mole-glyph`
   (CSS). Outer now only holds `translate(-50%,-50%)` — full 80×80px hit area
   from DOM entry. `effects.js`: `sonidoAppear` and `noiseGlitchDisappear` now
   target `el.firstElementChild` for all scale/filter/opacity. `cssGlitch`
   (post-click) still operates on outer.

**Also in this commit:**
- `touch-action:manipulation` on `.field`, `touch-action:none` on `.mole-el`
- Dead `startRound1`/`endRound1` removed from `round1.js`
- Purpality lifespan restored to 800ms (was `speed * 0.43` = 344ms)
- HUD asymmetric weighting: score `clamp(44px,8.5vw,64px)`, misses/combo
  `clamp(16px,2.6vw,20px)` at `opacity:.68`
- Tonal heat ramp on `.hud`: combo ≥3 → ivory, ≥5 → purpality-purple;
  `hudEl` cached in `ui.js`; Round 2/3 inherit automatically

### Open items
- Live confirmation of HUD heat ramp across all rounds
- `game.js` dead `ROUNDS[0].speed`/`.max` fields — cosmetic, not touched
- Lu'u Dan-style per-round codename — deferred (naming convention needed first)

---

## wave phantom hits + misc fixes — 2026-07-14

### Committed & pushed to `main` (`eae0bb5`)

**Wave phantom hit fix (3 changes):**
- Wave now stores `tx/ty` (shooter position at spawn time) — hit detection uses stored target, not live `invShooterX`. Previously wave could miss visually but hit because player walked into its travel path
- Hitbox tightened: `s.r*0.55` → `s.r*0.35` — less generous radius at full size (120px → 42px effective radius)
- Wave killed immediately on hit (`s.alive=false`) — previously kept travelling 200px past target, allowing phantom hits during overshoot

**Machina dmg:** `0.3` → `0.7` per stream on boss (2.1 dmg/burst at 3 streams)

**Wave VFX:** `vfx_wave.webm` re-exported from ProRes 4444 with black background keyed out via ffmpeg `colorkey=0x000000:0.15:0.05`, VP9 alpha. `mix-blend-mode:normal` on all 3 video elements.

**Syntax fix:** unescaped `'` in `rapid'aa` machina modal desc was breaking game load.

**fokus lina boss modal:** beam+dua beam combo now shows single centred `fokus lina.` button (`invBossUpgrade='fokus_lina'`). `flCanActivate()` gated on `invBossUpgrade==='fokus_lina'` only.

**Fokus lina fire phase:** only `!invMouseDown` cancels — removed `!state.running` check. No hard stop at 4s cap — continues at max dmg/width until mouseup.

---

## fokus lina + wave VFX echo rebase — 2026-07-14

### Committed & pushed to `main` (`58b3f0b`) — force push over concurrent wave VFX echo commit

**Wave VFX echo system (from concurrent session `e60dd6f`) preserved:**
- `_makeWaveVideo(opacity)` factory, 3 video elements: `vfxWaveVideo` (100%), `vfxWaveEcho1` (45%), `vfxWaveEcho2` (20%)

**Fokus Lina (beam + dua beam boss wave ability):**
- Trigger: hold mouse 3s on boss wave — releases early cancels, must recharge
- Charge phase (0–3s): pulsing radial glow at shooter + 3 curved bezier lines emerging from 190px, converging to beam origin. Player speed 50% slow (lerp 0.09)
- Fire phase (3–7s): constant beam, dmg ramps 4→27hp over 4s (`FL_DMG_START=4`, `FL_DMG_CAP=27`, `FL_TICK_MS=50ms`). Player speed 70% slow (lerp 0.054)
- Width: starts 113px, grows ×1.25 at each second of fire phase (steps at t=1,2,3,4s). Compounds on new value
- Cancel: mouseup at any point resets fully. `flCancel()` clears rAF and all state
- `flCanActivate()`: requires `invWave2Upgrade==='beam'` OR `invWave4Upgrade==='dua beam'` AND `invWave===5`

**Other changes carried forward:**
- beam/dua beam rename complete (missile→beam everywhere)
- Beam VFX: glow column, core, chromatic aberration, blurred edge lines with 40% fractal noise, soft muzzle ellipse
- Wave 5 300ms beam immunity (`invWave5ProtectUntil`)
- `resumeInvaders()` exported; devpanel close resumes game
- Salvo AOE replaced with `_castAndFireBeam`
- `invShooterX` snapped on mousedown

### Open items
- Boss SFX: pincer and teleport still paused
- Wave VFX `playbackRate` sync: not yet done
- `???` combos: beam+rapidaaa, beam+dua beam TBD (rapida+rapidaaa → machina done)
- All boss-wave upgrade combos need live playtesting
- **Rebase conflict rule: if conflict on `round2.js`, always take `--ours`**

---

## beam + dua beam VFX + fixes — 2026-07-13

### Committed & pushed to `main` (`4571b27`)

**Beam edge glow:** `blur(1.8px)` on edge stroke lines + 40% fractal glitch noise (short jittered vertical segments, ±3.5px x-jitter, re-rolls every frame). Drawn via `save/restore` to isolate filter.

**Beam muzzle cutoff:** replaced flat-top arc with full soft ellipse (`0` to `Math.PI*2`), centre pushed down `muzzleR*0.18` so top half dissolves into beam body. Multi-stop radial gradient (0 → 0.4 → 0.75 → 1) fades cleanly with no hard edge.

**Dev panel freeze fixed:** `closeDevPanel()` now calls `resumeInvaders()` (new export from round2.js) which sets `state.running=true` and restarts `invLoop()` if rAF was killed. Import added to devpanel.js.

**Wave 5 beam skip fixed:** 300ms immunity window (`invWave5ProtectUntil`) stamped only on `waveIdx===4` spawn. All other waves unaffected.

**Beam snap:** `invShooterX` snapped to exact cursor on mousedown (was lerp-lagged during hold-fire).

**Stacking:** dua beam subsumes beam interval when both active — single 450ms interval, clean rhythm.

### Open items
- Boss SFX: pincer and teleport still paused
- Wave VFX `playbackRate` sync: not yet done
- `???` combos: beam+rapidaaa, rapida+dua beam → now beam+rapidaaa, beam+dua beam paths TBD (rapida+dua beam already handled)
- All boss-wave upgrade combos need live playtesting

---

## beam + dua beam tuning — 2026-07-12

### Committed & pushed to `main` (`0f9d3da`)

- **Hit precision:** beam hit radius = 1px each side (2px total), dua beam = 2px each side (4px total). Visual width unchanged (113px / 280px). Enemies must be directly under shooter.
- **Beam origin:** beam stops ~38px (1cm) above shooter sprite — drawn from `y=0` to `y=ch-105`. No longer appears to originate inside sprite.
- **Dua beam colour:** mid-purple (`rgba(180,100,255)` glow, `rgba(210,160,255)` core, `rgba(200,130,255)` edges). Beam stays ice blue.
- **Intervals:** both beam and dua beam at 450ms (matches VFX cast+flash+fade duration). No cooldown gates inside fire functions — interval only.
- **Stacking:** when beam + dua beam both active, dua beam subsumes beam — single 450ms interval, no double-fire.

---

## beam + dua beam overhaul — 2026-07-12

### Committed & pushed to `main` (`3b3a55c`)

**missile→beam (wave 2, 1.5s CD, 113px wide):**
- Instant-hit vertical clear: all enemies with `Math.abs(e.x - cx) <= 56.5` die immediately on fire
- 150ms cast sequence: thin 60px line expands to 113px, then 120ms full flash, 180ms fade
- VFX drawn via `isBeam` particle: outer glow column (linear gradient), bright core (28% of width), chromatic aberration fringe (red left, blue right), edge glow lines
- Shared via `_castAndFireBeam(cx, bw, dmg)` — called by both `fireBeam` and `fireDuaBeam`
- Salvo also uses `_castAndFireBeam` now (old inline AOE replaced)

**doublets → dua beam (wave 4, 1.0s CD, 280px wide):**
- Same mechanic, wider beam (280px = ~5 columns × cellW)
- Calls `_castAndFireBeam(invShooterX, DUA_BEAM_WIDTH, 1)`

**Remaining stale `kind:'missile'` bullet references:** only on salvo's doublet pair projectiles and rapidaaa bullets — these are still travelling projectiles, not beams; intentionally unchanged.

**Boss modal combo desc:** updated to `beam + dua beam`

---

## machina dmg + missile col-clear fix — 2026-07-12

### Committed & pushed to `main` (`079b450`)

**Machina damage:** boss hit damage per stream raised from `0.3` → `0.5`.

**Missile column clear bug fixed:** `fireMissile()` and `fireSalvo()` both used `Math.abs(e.x - invShooterX) <= INV_AOE_RADIUS` (40px) — too narrow, drift-sensitive. Both now map `invShooterX` to nearest alive entity col index, then clear `Math.abs(e.col - shooterCol) <= 1` (exactly ±1 col). Fallback to radius if no alive grid entities. Salvo carries the same fix.

---

## Boss modal: rapida+rapidaaa → machina — 2026-07-11

### Committed & pushed to `main` (`096d593`)

`showBossUpgradeModal` now has a third combo branch: `invWave2Upgrade==='rapida' && invWave4Upgrade==='rapidaaa'` (and reverse order).
- Both buttons reset cleanly on each modal open (`style.cssText`, `style.display` restored) to avoid bleed from previous combo branches
- rapida+rapidaaa path: `btn2` hidden (`display:none`), `btn1` centred (`display:block;margin:0 auto`), label `machina.`, desc `the void.<br>rapida + rapid'aa.<br>convergence.`, assigns `invBossUpgrade='machina'`
- beam+dua beam path: unchanged (salvo / overcharge)
- all other combos: unchanged (`???` → null)
- machina mechanics unchanged: 3 converging streams, `INV_FIRE_RATE/3.2`, 0.3 dmg/stream on boss

### Open items
- Boss SFX: pincer and teleport SFX still paused
- Wave VFX speed/sync: `video.playbackRate` not yet set dynamically to match travel distance
- `???` combos (beam+rapidaaa, rapida+dua beam) — mechanics TBD
- All boss-wave upgrade combos need live playtesting

---

## CURRENT LIVE STATE — as of `c01f5b0` (2026-07-11)

### Repo
`kasdaededejoj/whack-a-mole` — GitHub Pages at `https://kasdaededejoj.github.io/whack-a-mole/`
Architecture: vanilla JS, modular `js/` structure. `HANDOVER.md` is the shared source of truth.
Push workflow: PAT embedded in remote URL via `curl`/`git` in bash tool. Adam authorises reuse within session.

### Round 2 — fully functional
Waves 1–4 → boss wave (wave 5). All upgrades working. No known broken behaviour.

### Upgrade system

**Wave 2 modal** (pick one):
- `rapida` — hold-to-fire bullets at 2× rate (`INV_FIRE_RATE/2`). Display: "rapida"
- `missile` — hold-to-fire, 1.3s cooldown, AOE column-clear within `INV_AOE_RADIUS` of shooter X. Display: "missile"

**Wave 4 modal** (pick one):
- `doublets` — hold-to-fire, 0.8s cooldown: missile 1 straight up, missile 2 diagonal homing toward densest cluster, clears ±2 cols (5 sprites). Display: "doublets"
- `rapidaaa` — hold-to-fire bullets at 2.8× rate (`INV_FIRE_RATE/2.8`), steers toward nearest enemy by y. Display: "rapid'aa"

**Boss modal** (pick one — evolves the beam+dua beam combo):
- `salvo` — hold-to-fire, 1s cooldown: fires missile AOE + doublet pair simultaneously. Display: "salvo."
- `overcharge` — hold-to-fire, 2s cooldown: wide column-clear (AOE radius ×2.5, instant-kills all non-boss enemies in column) + warh-class missile aimed directly at boss. Display: "overcharge."

**Upgrade carry-over:**
- Wave 2 and wave 4 picks tracked in `invWave2Upgrade` + `invWave4Upgrade` independently
- `missile` (wave 2) stacks alongside `doublets` (wave 4) — both fire on hold
- When boss combo is active (`salvo`/`overcharge`), it replaces individual beam+dua beam bindings
- `invFire()` resolves: `invBossUpgrade==='machina'` → machina; else `invWave4Upgrade||invUpgrade` (legacy path, not used in current beam+dua beam combo)
- Base bullet suppressed when `invWave2Upgrade==='beam'` and no bullet-firing wave4/boss upgrade active

**Boss HP scaling:**
- Base `INV_BOSS_HP=313`; scales `×1.5^upgradeCount` at `spawnInvaderWave(5)`
- `upgradeCount` = non-null count of `[invWave2Upgrade, invWave4Upgrade, invBossUpgrade]`
- 0 upgrades → 313 HP; 1 → 470; 2 → 704; 3 → 1056
- Phase 2 threshold (50% HP) and boss HP bar both use `boss.maxHp` — scale correctly

### Boss mechanics
- **Teleports** every 3s to random anchor (top half canvas, 10% x-padding), white flash on landing
- **Pincer** (phase 1, active from start): soft-homing curved arc, 4s CD (3.5s at phase 2), speed 5.25 (×1.3 at phase 2 ≈ 6.8). 12–15 dmg. Drawn purple → yellow glow at phase 2.
- **Travelling wave** (phase 2 only, ≤50% HP): aimed at player position, speed 4.8, 31–34 dmg. Drawn as AE sprite sheet VFX (`assets/vfx_wave.png`, 26 frames, `lighter` blend, tracked to projectile). CD 3s. Fires immediately on phase 2 transition.
- **Phase 2 transition**: `bossGlitchBurst=55` frames of heavy glitch + boss grows to 1.38× via lerp
- Boss SFX (wave, pincer, teleport) — **paused, pending Adam's direction**

### Bullet behaviour
- `bullet` — 1.25× speed, pierce 2 enemies
- `missile` — standard speed, column-clear on hit (1 col)
- `warh` — standard speed, column-clear ±1 col (3 total) on non-boss; 20 dmg on boss
- `machina` — 3 converging streams with `vx` drift, meet at ~55% canvas height, 0.3 dmg/stream on boss
- Diagonal homing missile (`isDiagonalHoming:true`) — column-clear ±2 cols (5 total)

### HP bars (both on-canvas, not DOM)
- **Boss HP bar**: top of canvas, full width, 3px, white → yellow at phase 2, label "VOID"
- **Player HP bar**: bottom of canvas, above shooter, 2px, white → red at ≤30 HP

### Damage VFX (on player hit)
- Canvas: red vignette flash (0.32α, decays), echo vignette at 120ms, chromatic aberration 18 frames, glitch displacement 10 frames
- SFX: `playPlayerDamage()` — sub-bass 40Hz + 155Hz thud + echo layer at 120ms

### VFX sprite sheet
- `assets/vfx_wave.png` — 26 frames, 480×270 each, horizontal strip (12480×270), 236KB
- Source: AE MP4, black background keyed with ffmpeg luminance threshold
- `activeVfx[]` system present for future VFX (pincer hit, teleport etc.) — upload AE clip to chat

### JS module structure
```
js/
  audio.js       — full procedural SFX suite
  effects.js
  game.js        — initGame, startRound, endRound
  state.js       — shared mutable state object
  ui.js          — field, msgEl, setComboValue, showFail
  utils.js
  rounds/
    round1.js
    round2.js    — all wave/boss logic (1457 lines)
    round3.js
```

### Known open items
- Boss SFX (wave, pincer, teleport) — paused
- `positionNukaUI()` still runs every frame on non-boss waves (minor, low cost, fine to leave)
- All boss-wave upgrade combos need live playtesting

### Security / pitfall checklist (Mode 3 standing requirement)
On every edit check: event handler leaks (re-registered onclick/addEventListener), interval/RAF ghosts (missing clearInterval/cancelAnimationFrame), off-screen object leaks (unbounded arrays), dead code from refactors, double-firing from stacked input events (mousedown + click).

---

## Wave size + shooter hit effect — 2026-07-11

### Committed & pushed to `main` (`c01f5b0`)

**Wave VFX size** — reduced to `rect.width*0.25` (25% canvas width).

**Shooter sprite hit effect** — on damage, localised purple VFX centred on shooter at `(invShooterX, ch-54)`, driven by existing `_hpAberrationFrames` and `_hpGlitchFrames` counters:
- Purple radial glow: `createRadialGradient` 0→38px, alpha scales with `hitIntensity` (`max(aberFrames/18, glitchFrames/10)`)
- Clipped aberration fringe: purple left / green-cyan right, masked to 28px arc clip around sprite
- Glitch strips: 2 random purple horizontal bars, masked to 32px arc clip
- Sprite jitter: ±4px X, ±2px Y while `_hpGlitchFrames>0`
- Stroke colour: shifts from white toward purple-white at peak intensity, decays back to white

Screen-level purple vignette + `-hp` float still active alongside the sprite effect.

### Open items
- Boss SFX: pincer and teleport SFX still paused
- Wave VFX speed/sync: `video.playbackRate` not yet set dynamically to match travel distance
- `???` combos (rapida+dua beam, rapida+rapidaaa, beam+rapidaaa) — mechanics TBD
- All boss-wave upgrade combos need live playtesting

---

## Boss VFX, SFX, hit effect, phase2 fix — 2026-07-11

### Committed & pushed to `main` (`4c1fe1a`, `d12968d`, `352bebb`, `624c8fc`)

**VFX pipeline: sprite sheet → WebM video element**
- `assets/vfx_wave.webm` added (56KB, ProRes 4444 source with real alpha, converted via ffmpeg VP9 `yuva420p`)
- `vfxWaveVideo` — single `<video>` element appended to `document.body`, `mix-blend-mode:screen`, `position:fixed`, `pointer-events:none`
- On `spawnWave()`: 400ms charge animation (3 purple contracting rings on boss canvas position via rAF), then `launchWaveVfx()` fires — video positioned at boss page coords, travels to shooter via rAF at `BOSS_WAVE_SPEED` pace
- Video width: `rect.width*0.5` (50% canvas width), aspect 16:9
- Angle: `Math.atan2(ty-boss.y, tx-boss.x)-Math.PI/2` — points wave toward shooter
- Physics `bossShockwaves` projectile unchanged — hit detection runs independently of VFX
- Canvas fallback crescent still draws at `globalAlpha:0.18` if video not loaded
- Entire sprite sheet system removed: `vfxWaveImg`, `activeVfx`, `spawnVfxWave`, `VFX_WAVE_FRAMES/FRAME_W/FRAME_H`, draw loop — all gone
- `vfxWaveRaf` and video paused/hidden in `stopBossAbilities()`
- Safari HEVC fallback not implemented — WebM only (Safari desktop v16+ supports it)

**Boss wave cast SFX — `playBossWaveCast()` in `audio.js`**
- Layer 1: infrasonic sine 28→14Hz over 0.85s (sub-threshold pressure)
- Layer 2: sawtooth 55→32Hz, hard lowpass at 90Hz — sub-bass octave descent
- Layer 3: bandpass noise at 120Hz, 0.75s — void texture
- Layer 4: triangle click 180→60Hz, 60ms — cast initiation transient
- Called in `spawnWave()` at cast moment (before charge animation)

**Phase 2 threshold fix**
- Was: `boss.hp <= INV_BOSS_HP*0.5` (triggered at ~22% actual HP due to scaling)
- Now: `boss.hp <= boss.maxHp*0.5` (correct 50%)

**Boss HP fixes (from previous session)**
- Base HP: `INV_BOSS_HP=444` → scales to ~666/1000/1500 at 1/2/3 upgrades
- HP display: `e.maxHp` not `INV_BOSS_HP`
- Boss defeat gate: only advances on wave 5 when `boss.hp<=0 && !boss.alive`

**Missile fixes (from previous session)**
- Targets lowest alive row (largest Y), vertical window `44*3px`
- Hold repeat: 600ms missile, 400ms doublets (cooldown gates individual clicks at 1300/800ms)

**Player hit effect — purple glitch**
- Vignette: purple radial gradient (`rgba(130,30,200,0.95)`) replacing red
- Chromatic aberration: purple left fringe, green-cyan right fringe, purple scan line
- Floating `-{amount}` text: rises from shooter sprite (`invShooterX, ch-70`), purple with glow, horizontal jitter while `_hpGlitchFrames>0`, fades over ~55 frames
- `_dmgFloats` array: `{text, x, y, alpha, vy}` — drawn in `invDraw` after glitch block

### Open items
- Boss SFX: pincer and teleport SFX still paused
- Wave VFX speed/sync tuning — video `playbackRate` not yet set dynamically to match travel distance
- `???` combos (rapida+dua beam, rapida+rapidaaa, beam+rapidaaa) — mechanics TBD
- All boss-wave upgrade combos need live playtesting

---

## Boss modal ??? placeholder — 2026-07-10

### Committed & pushed to `main` (`5a40176`)

`showBossUpgradeModal` is now combo-aware. Checks `invWave2Upgrade==='beam' && invWave4Upgrade==='dua beam'`:
- **beam + dua beam** → buttons show `salvo.` / `overcharge.` as before
- **all other combos** → both buttons show `???`, both assign `invBossUpgrade=null` (no-op). Boss wave starts normally; wave 2 + wave 4 carries still active. Placeholder until mechanics are designed.

### Open items
- Boss SFX (wave, pincer, teleport) — still paused
- `???` combos (rapida+dua beam, rapida+rapidaaa, beam+rapidaaa) — mechanics TBD
- All boss-wave upgrade combos need live playtesting

---

## Upgrade renames + click-fire + boss combos — 2026-07-10

### Committed & pushed to `main` (`0f5a0a4`, `517bf15`, `0ba647e`)

**Upgrade renames (internal string keys + display labels):**
- `rapidfire` → `rapida` / display "rapida"
- `rapidfire_homing` → `rapidaaa` / display "rapid'aa"
- `aoe` → `missile` / display "missile"
- `doublemissile` → `doublets` / display "doublets"
- All modal button labels lowercase

**beam + dua beam → click-fire with hold-to-repeat:**
- `missile` (wave 2): hold-to-fire, repeats every `MISSILE_CD=1300ms`. AOE column-clear logic unchanged. Fires `fireMissile()`.
- `doublets` (wave 4): hold-to-fire, repeats every `DOUBLETS_CD=800ms`. Straight + diagonal homing pair. Fires `fireDoublets()`.
- Both use separate hold intervals: `invMissileHoldInterval`, `invDoubletsHoldInterval` — cleared on mouseup, mouseleave, and `stopInvaders()`.
- Base bullet (`invFire()` + `invFireInterval`) suppressed when `invWave2Upgrade==='beam'` and no bullet-firing wave4/boss upgrade active (`rapida`/`rapidaaa`/`machina` would re-enable it).
- Old autofire system (`startDoubleMissileAutoFire`, `stopDoubleMissileAutoFire`, `invDoubleMissileInterval`, `DOUBLEMISSILE_CD`, `invAoeCooldown`, `INV_AOE_INTERVAL`) fully removed.

**Boss modal — salvo + overcharge (beam+dua beam combo evolutions):**
- Modal desc updates dynamically to show combo context.
- `salvo` (`SALVO_CD=1000ms`): fires missile AOE + full doublet pair simultaneously on each interval.
- `overcharge` (`OVERCHARGE_CD=2000ms`): wide column-clear (`INV_AOE_RADIUS×2.5`, instant-kills all non-boss enemies in column) + `warh`-class missile aimed directly at boss position.
- Both are hold-to-fire via `invMissileHoldInterval` (reused). Cooldowns reset to 0 on boss modal pick.
- `invSalvoCooldownUntil`, `invOverchargeCooldownUntil` track cooldowns independently.
- Boss modal button IDs unchanged (`boss-upgrade-nuka` → salvo, `boss-upgrade-machina` → overcharge). Old `warh`/`machina` boss upgrade paths still exist in code as legacy but are no longer reachable via the modal.

### Open items
- Boss SFX (wave, pincer, teleport) — still paused
- Only beam+dua beam combo path exists; rapida/rapidaaa boss combos (combos 3–8) not yet built
- All boss-wave upgrade combos need live playtesting

---

## rapidfire rates — 2026-07-10

### Committed & pushed to `main` (a3b8592)
- Wave 2 `rapidfire`: `INV_FIRE_RATE/4` → `INV_FIRE_RATE/2` (2× rate)
- Wave 4 `rapidfire_homing`: now `INV_FIRE_RATE/2.8` (2.8× rate, distinct from wave 2)
- Homing check reads `invWave4Upgrade||invUpgrade` — carries correctly into boss wave

---



### Committed & pushed to `main` (b3bb5d0)

**Wave 2 + wave 4 upgrades carry into boss fight:**
- Added `invWave2Upgrade` and `invWave4Upgrade` vars — track each pick independently so both persist even after `invUpgrade` is overwritten
- `invFire()` resolves: `machina` boss upgrade → machina; else `invWave4Upgrade||invUpgrade`
- AOE system checks `invUpgrade==='aoe'||invWave2Upgrade==='aoe'` — fires during boss wave if wave2 was aoe
- `rapidfire` (wave2) carries: fire rate in `invHandleMouseDown` uses `invWave4Upgrade||invUpgrade`
- Both trackers reset in `startInvaders()` and `stopInvaders()`

**doublemissile → autofire 1.5s, no click-fire:**
- Removed from `invFire()` click-fire path entirely
- `startDoubleMissileAutoFire()` fires every `DOUBLEMISSILE_CD=1500ms`
- Missile 1: straight up from `shooterX-18`
- Missile 2: diagonal homing — finds enemy column with most neighbours within ±2 cols, aims there
- Diagonal missile `isDiagonalHoming:true` flag → hit detection clears ±2 cols (5 sprites total)
- `stopDoubleMissileAutoFire()` called in `stopInvaders()` and `startInvaders()`
- Restarted in `pickBossUpgrade()` if `invWave4Upgrade==='doublemissile'`
- Click-fire blocked in `invHandleMouseDown` when doublemissile is active

**Boss HP scales ×1.5 per upgrade chosen:**
- Computed at `spawnInvaderWave(5)`: `scaledHp = INV_BOSS_HP × 1.5^upgradeCount`
- `upgradeCount` = number of non-null values in `[invWave2Upgrade, invWave4Upgrade, invBossUpgrade]`
- Examples: 0 upgrades = 313 HP; 1 = 470; 2 = 704; 3 = 1056
- `boss.maxHp` set to `scaledHp` so HP bar and phase 2 threshold (50%) both scale correctly

### Open items
- Boss SFX still paused
- `positionNukaUI` still runs every frame (low cost, minor)

---

## Bug sweep — 2026-07-10

### Committed & pushed to `main` (8c931ba)

**#1 Bullet out-of-bounds leak** — filter now checks all four edges: `y<-20`, `y>ch+20`, `x<-60`, `x>cw+60`. Warh homing bullets with diagonal `vx` no longer persist off-screen forever.

**#2 invFireInterval ghost on warh** — `invHandleMouseDown` now clears `invFireInterval` before the warh early-return. Any interval from a previous non-warh upgrade is flushed cleanly.

**#3 Double-registered onclick handlers** — `showUpgradeModal` and `showBossUpgradeModal` both now null all button `onclick` refs before setting new ones. Previously each modal open stacked a new handler on top, so wave 4 picks would fire twice.

**#4 Homing targets closest enemy, not first in array** — `rapidfire_homing` now reduces `invEntities` to the alive non-boss enemy with the largest `y` (nearest to shooter). Previously always targeted top-left enemy regardless of position.

**#5 Double shot on click** — `invHandleSingleClick` no longer calls `invFire()` for non-warh upgrades. Mousedown handles firing; click only repositions the shooter. Warh still fires on click (cooldown-gated, safe).

**#6 Dead constants removed** — `BOSS_SHOCKWAVE_R_MAX_P1`, `BOSS_SHOCKWAVE_DURATION` were declared but never read. Removed.

**#7 Dead `invNukaSkillActive` guard removed** — from `invFire()`. Nuka skill is dead code; the var is always `false`.

### Open items
- Boss SFX (wave, pincer, teleport) — still paused
- `positionNukaUI` still called every frame on non-boss waves (minor, low cost)

---

## Warh click-fire + wave VFX on projectile — 2026-07-09

### Committed & pushed to `main` (e9a3e03)

**Warh → click-fire with 1s cooldown:**
- `startWarhAutoFire()` is now a no-op (resets `invWarhCooldownUntil=0`)
- `fireWarh()` handles click-fire: checks `Date.now()<invWarhCooldownUntil`, fires one warh missile, sets next allowed fire at `now+1000ms`
- `invHandleMouseDown` + `invHandleSingleClick` both route to `fireWarh()` when `invBossUpgrade==='warh'`; holding mouse does not repeat (returns after first fire)

**Wave VFX tracked to projectile:**
- Procedural crescent draw removed from `drawBossAbilities`
- Each shockwave now maps `travelledDist/targetDist` → sprite frame index, slices the correct column from `assets/vfx_wave.png`, draws at projectile position rotated to travel direction
- Blend mode `lighter`, alpha 0.9
- Fallback crescent draw included if sprite sheet not yet loaded
- `spawnVfxWave()` on-hit call removed (VFX is now the projectile itself, not an on-hit effect)
- `spawnVfxWave` and `activeVfx` system still present for future use

**Instakill audit (read-only):**
- No instakills anywhere. `hpRest:1` enemies die in one bullet — intentional. Column-clears intentional. Boss min 16 warh hits. Player needs 3 shockwave hits or 7–8 pincer hits to die.

### Open items
- Boss SFX (wave, pincer, teleport) — still paused
- `activeVfx` / `spawnVfxWave` system available for pincer/teleport VFX if AE clips provided

---

## Wave hit VFX (AE sprite sheet) — 2026-07-09

### Committed & pushed to `main` (5710cc1)

**Source:** `round_2__final_boss__travelling_wave_vfx__v2.mp4` — H.264, 26 frames @ ~30fps, 1920×1080, black background (no alpha in MP4)

**Processing pipeline:**
- `ffmpeg` extracted 26 PNG frames
- `ffmpeg colorkey=black:0.25:0.1` keyed out black → RGBA PNGs
- Scaled to 480×270 (25% of source)
- `convert +append` packed into horizontal sprite sheet → `assets/vfx_wave.png` (236KB, 12480×270)

**Integration:**
- `loadVfxAssets()` preloads the sprite sheet image on `startInvaders()`
- `spawnVfxWave(x, y)` pushes an entry into `activeVfx[]` — centred on player position, scaled to ~42% of canvas width
- Triggered in `updateBossAbilities()` when a shockwave hits the player (alongside `damagePlayer()`)
- `invDraw()` advances `v.frame` each frame and slices the correct column from the sprite sheet via `drawImage(img, frame*frameW, 0, frameW, frameH, x, y, w, h)`
- Blend mode: `lighter` — glow adds on top of game content

**Key constants:**
```
VFX_WAVE_FRAMES=26, VFX_WAVE_FRAME_W=480, VFX_WAVE_FRAME_H=270
sprite sheet: assets/vfx_wave.png (12480×270)
```

### Open items
- Boss SFX (wave, pincer, teleport) — still paused
- If you have more AE VFX (pincer hit, teleport flash etc.) — same pipeline applies

---

## Damage VFX + warh click removal + wave4 carry-over — 2026-07-09

### Committed & pushed to `main` (0534ca4)

**Player damage VFX (glitch + aberration + echo):**
- `triggerHpDrainAnimation` now sets `_hpAberrationFrames=18`, `_hpGlitchFrames=10` on every hit
- `invDraw` reads these counters at the top of every frame (before anything else is drawn): paints red/cyan edge fringe strips (`aberShift=4px max`) + a horizontal scan line for aberration; 3 random white rect strips for glitch displacement
- Both counters decrement each frame — aberration lasts ~18 frames (~0.3s), glitch lasts ~10 frames (~0.17s)
- Primary vignette flash unchanged (0.32 start alpha, -0.022/frame decay)
- Echo vignette: second identical flash fired at 120ms delay, dimmer (0.14 start alpha)
- SFX echo layer 4 added to `playPlayerDamage()` in audio.js: delayed 120ms repeat of the 155Hz triangle thud at half gain (`0.15×sfxVolScale`)

**Warh: no click-fire, no keycap:**
- `invHandleMouseDown` and `invHandleSingleClick` both return early (no `invFire()`) when `invBossUpgrade==='warh'`. Position tracking still works normally.
- `positionNukaUI()` returns early when `invBossUpgrade==='warh'`
- On warh pick: `hideNukaPrompt()` + `setNukaCooldown(false)` called explicitly to ensure keycap is hidden

**Wave 4 upgrade carries into boss wave:**
- `invFire()` now resolves: `machina` boss upgrade → overrides to machina; else → `invUpgrade` (wave4 weapon). Warh is additive — it auto-fires separately, click-fire uses wave4 weapon underneath.
- `invHandleMouseDown` fire rate uses same logic: `machina` boss upgrade overrides, else `invUpgrade` drives rate
- Result: doublemissile + warh = wide slow missiles every 1.5s AND double missiles on click. rapidfire_homing + machina = machina on click.

### Open items
- Boss SFX (wave, pincer, teleport) — still paused
- All boss-wave combos need live playtesting

---

## warh upgrade + boss grow/glitch + HP bar tweak — 2026-07-09

### Committed & pushed to `main` (db2a5a2)

**Nuka → warh (boss upgrade slot):**
- Upgrade kind renamed from `'nuka'` to `'warh'` throughout hit detection, palette, scale, draw, modal wiring
- `WARH_DAMAGE=20` applied on boss hit (was 7 for missiles)
- `WARH_INTERVAL=1500ms`, `WARH_HOMING_CHANCE=0.15`
- Scale `1.65` (wide body) vs missile `1.08` — visually ~1.5cm wide
- `startWarhAutoFire()` + `invLoop()` both called on pick; `stopWarhAutoFire()` called in `stopInvaders()`
- Dangling orphan `}}` (lines 745–746) removed — was leftover from an earlier refactor
- `resolveNukaInput` / `startNukaSkill` stubbed as no-ops to preserve export contract

**Boss grow + glitch at 50% HP:**
- `bossGlitchBurst=55` triggered at phase 2 transition (already existed in prior session stub at line 478; confirmed wired)
- `bossGrowthScale` lerps to `1.38` over ~1s via `+=0.06*(1.38-scale)` each frame (already implemented)
- Hitbox (`cellW`/`cellH`) scales with `bossGrowthScale` in draw loop — already live
- Phase 2 yellow aura also already uses `gs` multiplier

**Player HP bar:** height `3px → 2px`, fill alpha `0.72 → 0.58`, track alpha `0.12 → 0.09`

### Open items
- Boss SFX (wave, pincer, teleport) — still paused
- Pincer phase 1 / warh — first live playtests needed

---

## HP bar relocation — 2026-07-08

### Committed & pushed to `main` (7c57a45)

**Player HP bar moved from DOM to canvas, bottom of screen.**
Was: a thin DOM bar above the canvas (top of page, above the action). Now: drawn directly on the canvas at `ch-20`, full width minus 24px padding each side, 3px tall — sits right above the shooter sprite where the player's eye already is. `updatePlayerHpBar()` is now a no-op; `invDraw()` reads `invPlayerHp` each frame and paints it directly. Turns red at ≤30 HP. The DOM `#player-hp-wrap` is never shown anymore — `showBossUpgradeModal()` no longer calls `display:flex` on it.

**Boss HP bar moved from under the boss sprite to top of canvas.**
Was: a 100px wide bar 34px below the boss glyph (moved around with the boss, hard to track). Now: a full-width bar at `y=10`, 3px tall, padded 24px each side — stationary, always readable. Turns yellow when `bossPhase2` (matches the ability glow colour from the previous commit). Has a faint `VOID` label to the left.

**`triggerHpDrainAnimation`** stripped of all DOM bar logic — now only fires the canvas red vignette flash on damage.

---

## Boss ability swap + yellow glow + HP feedback — 2026-07-08

### Committed & pushed to `main` (067dadc)

**Boss ability order reversed:**
- Phase 1 (>50% HP): pincer only (was: wave only)
- Phase 2 (≤50% HP): wave unlocks in addition to pincer (was: pincer unlocked)
- `startBossAbilities()` now calls `schedulePincer()` immediately instead of starting the wave interval
- Phase 2 transition spawns an immediate wave + starts `setInterval(spawnWave, 3000)` (was 3500ms)

**Speed increases:**
- `BOSS_PINCER_SPEED`: 3.5 → 5.25 (×1.5) — pincer is now phase 1, needs to be felt immediately
- `BOSS_WAVE_SPEED`: 3.2 → 4.8 (×1.5) — replaces the old inline `3.2*(bossPhase2?1.3:1)` variable; `spawnWave()` is now a top-level function (not nested inside `startBossAbilities`)
- Phase 2 pincer retains `×1.3` multiplier on top of the new base → 5.25×1.3 ≈ 6.8 px/frame

**Cooldown reductions at phase 2 (0.5s each):**
- Wave interval: 3500ms → 3000ms (set in phase 2 transition block)
- Pincer CD: `schedulePincer()` now reads `bossPhase2 ? BOSS_PINCER_CD-500 : BOSS_PINCER_CD` — picks up on next cycle automatically

**Yellow glow on abilities at phase 2:**
- Pincer: switches from purple (`rgba(200,160,255,0.9)`) to yellow (`rgba(255,230,80,0.95)`), with a fat yellow glow shadow pass rendered before the main stroke
- Wave (travelling crescent): always yellow since it only exists in phase 2 — yellow glow underlay + yellow main stroke (replaces white)
- Uses `invCtx.shadowColor` + `invCtx.shadowBlur=18/20` for the glow; reset to 0 before main strokes

**HP bar damage feedback improvements:**
- Bar height: 2px → 4px (CSS `#player-hp-bar`)
- Red drain overlay opacity: 0.7 → 1.0 (fully opaque), z-index:2 over fill
- Drain fade duration: 550ms → 650ms
- HP text: gains `.hurt` class on damage → CSS `@keyframes hpTextPulse` pulses opacity 1→0.4→1 over 500ms, text turns `rgba(220,80,80,0.9)`; class removed after 600ms
- Canvas screen flash: radial red vignette painted directly onto the invader canvas, alpha starts at 0.28, decays by 0.025/frame (~11 frames); runs via its own `_hpScreenFlashRaf` separate from the main game loop

### Testing status
- Pincer phase 1 — first live playtest needed
- Wave phase 2 (now yellow) — first live playtest needed
- HP flash + text pulse — untested live; logic is straightforward

### Open items
- Boss SFX (wave, pincer, teleport) — still paused pending Adam's direction
- Descent snap grid (`Math.floor(invDescentY/20)*20`) — unchanged

---

## Machina, bullet, pincer, HP bar — 2026-07-07

### Committed & pushed to `main` (60baa5f)

**Machina skip-to-R3 fix (root cause):**
`pickBossUpgrade` was calling `invLoop()` without first calling `spawnInvaderWave(invWave)`. First frame of `invUpdate` found `invEntities` empty → `alive.length === 0` → `invWave === 5` → `endRound()` immediately. Nuka avoided it because `startNukaSkill` pauses the loop pending input. Fix: `spawnInvaderWave(invWave)` called before `invLoop()` in `pickBossUpgrade`.

**Machina double-fire fix (`a5c78df`):**
Previous fix had introduced a `setInterval` inside `pickBossUpgrade` that auto-fired `invFire()` regardless of mouse state. When player held mouse, `invHandleMouseDown` also started its own interval — two intervals running simultaneously. Removed the rogue interval entirely. `invHandleMouseDown` already reads `invBossUpgrade || invUpgrade` to determine rate on next mousedown.

**Machina redesign — 3 converging streams (`75d7220`):**
Three streams spawned at `x-60`, `x`, `x+60`. Left/right streams have opposing `vx` values (`spread / convergeDist * speed`) calculated to meet at ~55% canvas height. `kind:'machina'`, `pierceLeft:0`. Boss damage: `0.3` per stream hit. Draw: thin white dot + streak trail. Palette: `rgba(255,255,255,0.15)` trail, white body.

**Doublemissile fire rate (`4415c75`):** `1500ms → 400ms`. Two missiles per shot (±18px spread) unchanged.

**Bullet improvements (`708d5c3`):**
- Speed: `INV_BULLET_SPEED_UPGRADED = INV_BULLET_SPEED * 1.25` for all non-missile bullets
- Pierce: `pierceLeft:2` — kills first enemy, continues, stops on second kill
- Rapidfire: `INV_FIRE_RATE/4` (30ms)

**Travelling wave shape (`708d5c3`):** Crescent blade, rotated to travel direction (`angle - π/2`). Outer arc `π*0.1→π*0.9`, inner concave at `r*0.82`. Alpha `0.25→0.9` as it closes.

**Pincer 2× size (`2059245`):** Arc radius `10→20`, line span `±10→±20`, stroke `2→3.5`. Phase-2-only (≤50% boss HP).

**HP drain animation + damage SFX (`2059245`):**
Red overlay div from `toPct` to `fromPct`, fades 550ms. `playPlayerDamage()`: lowpass noise burst (80Hz), sub-bass `40→25Hz`, triangle thud `155→60Hz`. All decay 400–500ms.

### Current upgrade system state
- **Wave 2:** rapidfire (`INV_FIRE_RATE/4`), AOE missile
- **Wave 4:** double missile (400ms, ±18px pair), rapid+homing
- **Boss modal:** nuka, machina (3 converging streams, 0.3 dmg/stream)
- **Resolution:** `activeUpgrade = invBossUpgrade || invUpgrade`

### Open items
- Boss SFX (wave, pincer, teleport) — paused pending Adam's vibe direction
- Pincer not yet playtested at phase 2
- Descent snap grid (`Math.floor(invDescentY/20)*20`) unchanged — 20px steps at 60fps

---

## Boss travelling wave + SFX — 2026-07-06 (continued)

### Committed & pushed to `main` (2e6dd03)

**Boss shockwave replaced with travelling wave:**
Old behaviour: a static ring expanding outward from the boss's position at spawn time — never moved, player could ignore it.
New behaviour: on each cycle (`BOSS_SHOCKWAVE_INTERVAL` = 3500ms), boss snaps the player's current `(invShooterX, ch-54)` position at fire time and launches a projectile directly toward that point. Player has to dodge. Mechanics:
- Starts at `r=20`, expands linearly to `r=120` as it closes the distance (`progress = travelledDist / targetDist`)
- Speed: `3.2px/frame` (×1.3 in phase 2)
- Hit detection: `Math.hypot(wave.x - invShooterX, wave.y - (ch-54)) < wave.r * 0.55`
- Damage: 31–34 HP on contact
- Despawns when `y > ch + 40` or `travelledDist > targetDist + 200`
- Draw: single white circle stroke (`rgba(255,255,255,0.95)`), alpha fades in `0.25 → 0.9` as it closes — minimalist, readable

Phase 2 transition also spawns an immediate travelling wave (not old-style `born` object).

**HANDOVER note on boss abilities:** shockwave is now the travelling wave above. Pincer is phase-2-only (≤50% boss HP), soft-homing curved arc projectile (`BOSS_PINCER_CD` = 4000ms, speed 3.5). Pincer draw: small purple arc + white line, rotates to travel direction. Neither has SFX yet — paused pending Adam's direction on ability vibe.

---

## Round 2 SFX + Nuka cycling fix — 2026-07-06

### Committed & pushed to `main` (20f98eb)

**All SFX are procedural Web Audio (no files). Added to `audio.js`, imported into `round2.js`:**
- `playBulletFire()` — short square-wave snap, 900→300Hz over 70ms
- `playMissileFire()` — deeper sawtooth, 320→80Hz over 150ms; used for doublemissile, AOE, rapidfire_homing
- `playMachinaBurst()` — rapid triple square stutter (600/680/760Hz, 40ms apart)
- `playEnemyDeath(pitchMult)` — bandpass noise thud, pitch-randomised per kill; boss death uses 0.4× pitch
- `playWaveClear()` — sine sweep 300→900Hz over 450ms, fires at `nextInvaderWave()`
- `playUpgradePick()` — three ascending sine tones (520/660/880Hz); fires on both wave-4 and boss upgrade modal picks
- `playAoeTrigger()` — wide lowpass noise boom (~140Hz), fires each AOE cycle
- `playNukaActivate()` — sawtooth charge-up 80→440Hz over 500ms, fires when Space activates Nuka
- `playNukaSuccess()` — heavy lowpass noise detonation (~200Hz), fires on correct letter resolve

**Nuka cycling fix (`restoreNukaKeycapOpacity`):**
Previously: `hideNukaPrompt()` removed `.active` from `#nuka-keycap` (CSS `display:none`). `restoreNukaKeycapOpacity()` only lerped opacity back to 1 — element stayed hidden. Fix: `restoreNukaKeycapOpacity()` now re-adds `.active` before the opacity lerp, so the keycap reappears after each 3.5s cooldown.

---

## Bug fixes + Boss phase rework — 2026-07-06

### Committed & pushed to `main` (94a55bd)

**Root cause of game not loading at all:**
`round2.js` had a duplicate `let invUpgrade = null;` declaration (lines 52 and 84). ES modules always run in strict mode; `let` disallows redeclaration in strict mode — this was a `SyntaxError` that killed the entire module before a single line executed. `game.js` failing to import from `round2.js` meant `initGame()` never ran, so no welcome screen, no Shift+D, nothing.

**Three bugs fixed in `round2.js` (commit `79a8a88`):**
1. Duplicate `let invUpgrade` — removed second declaration and its comment block.
2. `activeUpgrade` used as a bare reference inside `invFire()` — was only declared inside `invHandleMouseDown()`. Added `const activeUpgrade = invBossUpgrade || invUpgrade;` at the top of `invFire()`.
3. Boss glyph hardcoded as `'???'` in `invDraw()` — changed to `e.glyph` so the random Yi Syllable from `BOSS_SPRITES` actually renders.

**`.nojekyll` added (commit `7595022`):**
No Jekyll config was ever present; Jekyll was passing through silently. `.nojekyll` is harmless and best practice for plain static sites on GitHub Pages. The game being broken was entirely the `let invUpgrade` SyntaxError, not Jekyll.

**Boss phase rework (commit `94a55bd`):**
- **HP bar now boss-phase only.** Hidden at `startInvaders()`, shown when `showBossUpgradeModal()` fires (entry to wave 5). Previously shown for the entire round.
- **Boss no longer descends.** Removed `+ drop * 0.34` from boss Y calculation. Boss stays in his sine drift (±72px X, ±16px Y) anchored in the upper area — he cannot drift to the bottom. Removed the `e.y > ch - 100` fail check (dead code now that he can't descend).
- **Boss teleports every 3 seconds.** `triggerBossTeleport()` picks a new random anchor: X within 10% padding from each edge (`padX = cw * 0.10`), Y between 20px and `canvas.height / 2`. Resets `orbitAngle` to 0 so drift resumes cleanly from the new position. Timer started in `startBossAbilities()`, cleared in `stopBossAbilities()`.
- **Teleport flash.** On each teleport, `bossTeleportFlash = 12` (frames). `invDraw()` renders a white rect overlay over the boss sprite that fades linearly over those 12 frames (`alpha = flash/12 * 0.7`).
- **Wave 4 missile upgrade: 1500ms fire rate.** `doublemissile` now fires at 1500ms intervals instead of `INV_FIRE_RATE` (120ms). Two missiles per shot at ±18px spread. The `kind: 'missile'` rendering was already correct.

### Testing status
- Game loads and Shift+D confirmed working.
- All SFX confirmed working by Adam.
- Boss travelling wave deployed but not yet playtested — first live build of this mechanic.
- Pincer (phase 2 only, ≤50% HP) not yet playtested.

---

> **Standing rule:** keep this file for handoff-worthy context: gameplay,
> architecture, bug history, testing status, workflow changes, unresolved work,
> complex sessions, or notes another AI would need to understand why the repo is
> the way it is. Tiny wording-only or obvious cleanup changes do not require a
> handover entry unless they change workflow or future AI decision-making. Keep
> old entries; add new ones under a dated heading rather than overwriting
> history.

---

## Boss Overhaul + Player HP — 2026-07-03

## Committed & pushed to `main` (182a227)

- **Descent speeds** reset to linear 0.2–1.0: wave 1→0.2, 2→0.4, 3→0.6, 4→0.8, 5→1.0. Fallback 0.2.
- **Player HP bar** — 100/100, shown during all of Round 2, hidden on exit. `damagePlayer(n)` handles damage + HP update + fail trigger. Bar turns red below 30HP.
- **Wave 4 upgrade modal** — Nuka and Machina removed from pool; now shows Double Missile + Rapid+Homing only.
- **Boss upgrade modal** (`#boss-upgrade-modal`) — triggers after wave 5 clears (completedWave===4), before boss spawns. Offers Nuka + Machina as an *additional* pick. Player keeps their wave-4 upgrade too. Active upgrade is resolved via `activeUpgrade=invBossUpgrade||invUpgrade` throughout the fire/spawn logic.
- **Random boss sprite** — picked from `BOSS_SPRITES=['ꋫ','ꊰ','ꉣ','ꇓ','ꆼ']` at spawn instead of static `???`. Font must support these Yi Syllables codepoints — `BlackChancery` fallback is `serif`, so browsers without the font will show tofu; worth testing.
- **Boss abilities:**
  - Phase 1 (>50% HP): shockwave only — expands 20px→120px over 4s, cycles every 3.5s. Player hit if shooter passes through the ring radius (±18px tolerance): 30–37 dmg.
  - Phase 2 (≤50% HP): shockwave range ×1.5 (→180px), speed ×1.3. Pincer unlocks — soft-homing curved arc projectile launched every 4s, steers toward shooter's live position every 4 frames. Hit radius 20px: 12–15 dmg.
  - All boss abilities cleaned up in `stopBossAbilities()`, called from `stopInvaders()`.

## Known risk

- Yi Syllable glyphs in `BOSS_SPRITES` may render as tofu on devices without font support. If this is an issue, swap to characters guaranteed by `BlackChancery` or the existing glyph sets.

---

## Wave Descent Speeds −0.2 — 2026-07-03

## Committed & pushed to `main` (076a02f)

All descent speeds reduced by 0.2 flat:
wave 1: 0.5→0.3, wave 2: 0.75→0.55, wave 3: 1.08→0.88,
wave 4: 1.46→1.26, wave 5: 1.7→1.5. Fallback 0.5→0.3.

---

## Wave 5 Speed + Nuka Row-Clear VFX — 2026-07-03

## Committed & pushed to `main` (01ce952)

- **Wave 5 descent speed 2.0→1.7** per Adam's preference.
- **Nuka bullet slowed from ×0.5 to ×0.25 of base** (`28×0.25=7px/frame`).
  Root cause of "instant wipe, no VFX": at ×0.5 (14px/frame) the bullet
  crossed the screen fast enough that `b.trail` never built up more than
  1 point before collision, so `if(b.trail.length>1)` never passed and
  the missile silhouette rendered for only 1–2 frames before targets
  disappeared — looked instant. Slowing to ×0.25 gives the missile
  enough flight time to be visually tracked.
- **Purple haze burst on each row-clear entity.** `invSpawnParticles`
  was already firing white dots per entity, but they're tiny and barely
  visible. Added `isNukaBomb:true, nukaBombR:28` particle on each
  cleared enemy — same purple radial glow + ring as the boss-hit bomb,
  scaled to `r=28` vs the boss bomb's `r=80`. `isNukaBomb` renderer
  updated to respect an optional `nukaBombR` field so boss and
  row-clear bursts can differ in size.

---

## Round 2 Speed Tuning + Nuka Keycap Lerp — 2026-07-03

## Committed & pushed to `main` (31ff9a5)

- **Descent speeds scaled ×4.17** — all `INV_WAVE_CONFIG` `descentSpeed`
  values raised proportionally from the 0.12 baseline to 0.5:
  wave 1: 0.12→0.5, wave 2: 0.18→0.75, wave 3: 0.26→1.08,
  wave 4: 0.35→1.46, wave 5: 0.48→2.0. Fallback also updated to 0.5.
- **`INV_BULLET_SPEED` raised from 7 to 28** (×4 multiplier, matching
  the descent scale to keep relative feel consistent). Nuka bullet
  still fires at `×0.5` (14px/frame). All other bullets at full 28.
- **Nuka keycap lerped opacity on cooldown.** Added
  `lerpNukaKeycapOpacity()` (cubic ease-in-out, 400ms), called by two
  new helpers: `showNukaKeycapCooldown()` fades keycap to 0.35 opacity
  on cooldown start; `restoreNukaKeycapOpacity()` fades it back to 1.0
  when cooldown ends. Both called from `startNukaCooldown()`.
  `hideNukaPrompt()` and `stopInvaders()` cancel the lerp rAF cleanly.
- **Nuka keycap letter `font-weight` 700→400** for a thinner glyph.

---

## Bullet Speed Revert + No-Cache Fix — 2026-07-03

## Committed & pushed to `main` (2711555)

- **AOE bullet speed reduction reverted.** Earlier today `spawnBullet()`
  was changed to fire AOE-upgrade bullets at `×0.75` speed — Adam
  clarified the intent: only the **Nuka bullet** (`×0.5`) should be
  slowed. All other bullets (including AOE/missile upgrade bullets) fire
  at full `INV_BULLET_SPEED=7`. `getRound2DebugInfo()` updated to match.
- **No-cache meta tags added to `index.html`.** Root cause of the
  recurring "changes aren't visible" issue: GitHub Pages CDN was serving
  stale `index.html` (and by extension stale JS modules) after deploys.
  Added `Cache-Control: no-cache, no-store, must-revalidate` + `Pragma`
  + `Expires` meta tags. These instruct browsers to always revalidate
  the HTML on load, which in turn forces fresh fetches of all JS
  modules. Won't affect load performance meaningfully (assets still
  served from CDN edge; only the revalidation check is added). If
  caching issues persist after this, the next step would be a GitHub
  Pages `_headers` file or query-string versioning on each JS import.

---

## Live Dev Overlay + Deploy Flakiness Note — 2026-07-03

## Committed & pushed to `main` (ec17f9d)

- **New "live overlay" toggle inside the existing Shift+D dev panel.**
  Unlike opening the dev panel itself (which still pauses the game via
  `state.running=false`), this toggle does NOT pause anything — it drops
  a small fixed corner HUD (`#dev-live-overlay`, updated every 200ms via
  `setInterval`) that keeps running during actual gameplay. Shows,
  per active round:
  - Round 1: spawn interval (ms), max alive, moles alive
  - Round 2: wave number (+ boss flag), descent speed, base vs.
    effective bullet speed (accounts for the AOE ×0.75 multiplier),
    Nuka bullet speed, active upgrade, whether the render loop
    (`invRaf`) is alive — this last one directly surfaces the exact
    ghost-rAF failure mode from earlier today if it ever recurs.
  - Round 3: player/enemy HP, current phase.
  Implemented via small `getRoundNDebugInfo()` getters exported from
  each round module (`round1.js`, `round2.js`, `round3.js`), read by
  `devpanel.js`. Purely additive — no existing exports/behavior changed.

## Deploy flakiness observed, not fully explained

- Since fixing the Pages source/workflow setup, deploys have gone
  failure → success → failure → success in immediate alternation, always
  with the same generic `"Deployment failed, try again later."` message
  and no other error detail. The workflow config itself matches GitHub's
  official templates exactly (checkout → configure-pages →
  upload-pages-artifact → deploy-pages, correct permissions). Current
  read: this is backend flakiness on GitHub's end, not a config problem
  — but if it keeps failing more than ~50% of the time going forward,
  worth revisiting (possibly the `github-pages` environment still
  settling after the source-type switch, or genuine Pages incident).
  Retry pattern that's worked so far: push again (a trivial commit is
  enough) rather than trying to re-run the failed job via API — the API
  re-run endpoint needs `actions: write` PAT scope, which hasn't been
  granted.

## Open thread carried into next session

- Adam reported the game feeling globally slower starting from **Round
  1, wave 1** — before any Round 2/Nuka-specific code even runs. No
  code in this session touched Round 1 or base movement speed, and
  `INV_WAVE_CONFIG` values are unchanged from before today. Leading
  theory was stale cache, but this needs to actually be re-tested now
  that the live overlay exists — check Round 1's reported
  `spawnIntervalMs` against the hardcoded `800` in `round1.js` to
  confirm whether the runtime value itself is off, or whether it's a
  perception/deploy-timing issue.

---

## GitHub Pages Deployment Fix — 2026-07-03

## Root cause found and fixed

Every fix pushed earlier today (freeze fix, layout fix, Nuka boss fix,
VFX) looked "not there" on the live site because **the deploy was
silently failing**, not because of caching. Repo Pages settings had
`build_type: "legacy"` (deploy-from-branch) while a `pages build and
deployment` Actions workflow was also trying to deploy — the two
collided, the build step always succeeded but the deploy step failed on
every single push. Fixed by Adam changing Settings → Pages → Source from
"Deploy from a branch" to "GitHub Actions". Confirmed via API
(`GET /repos/.../pages`) that `build_type` is now `"workflow"`.

Re-triggering a deploy requires either re-running the failed Actions job
(needs Actions:write on the PAT, which the current one doesn't have) or
a fresh push (works fine with the existing Contents:write PAT) — used
the latter. If deploys still show red after this, check
Settings → Pages again first before assuming it's a code bug.

---

## Bullet Speed Tuning + Nuka Boss Fix — 2026-07-03

## Committed & pushed to `main` (b368ad8)

- **AOE upgrade bullets** now fire at `INV_BULLET_SPEED*0.75` (25% slower)
  instead of the flat speed shared with every other bullet type.
- **Nuka bullet** speed changed from `×0.85` to `×0.5` (50% slower).
- **Nuka in the boss wave now actually does something.** Root cause:
  Nuka's payoff is an instant grid row-clear (`aliveRows`/`.row`-based),
  but the boss entity has no `.row`, so a successful check found nothing
  to clear. The only remaining effect was the Nuka bullet itself, fired
  straight up from wherever the shooter happened to be — while the boss
  drifts side to side — so it almost always missed. Net effect: the
  skill felt broken/unavailable against the boss even though it was
  technically still activating. Fixed by branching in
  `resolveNukaInput()`: on `invWave===5`, a successful check now deals a
  **guaranteed flat 25 damage** directly to the boss (bypassing the
  bullet-collision path entirely), mirrors the existing boss-hit/death
  handling (HP display in `msgEl`, combo increment, death cleanup), and
  spawns a new **purple haze bomb** particle effect (`isNukaBomb`, radial
  gradient glow + expanding ring in `invDraw()`) at the boss's position
  for a proper payoff visual, since there was no existing boss-specific
  VFX for this skill to reuse.
- Balance number (25 dmg) came directly from Adam — boss has
  `INV_BOSS_HP=313`, a normal bullet hit deals `7`, so this is a
  meaningfully bigger, guaranteed hit that still requires ~13 successful
  checks to solo the boss with Nuka alone (cooldown-gated, ~3.5s per
  success), not a one-shot.

---

## Round 2 Layout Fix + Nuka UI Tracking — 2026-07-03

## Committed & pushed to `main` (b1d455f)

- **Field now starts at the true top of the screen.** Root cause:
  `startInvaders()` hid Round I's `.hud` via `visibility='hidden'`, which
  keeps its layout space reserved even though nothing renders there, and
  never hid `.bar-wrap` (Round I's countdown timer bar) at all — both
  sat in the flex column above `.field`, pushing Round II's canvas down.
  Fixed by switching to `display='none'` for both in `startInvaders()`,
  restored via `display=''` in `stopInvaders()`.
- **Nuka keycap + cooldown bar now track the shooter sprite** instead of
  being pinned to a fixed bottom-right screen position. Added
  `positionNukaUI()` in `round2.js`, called every frame from
  `invUpdate()`, which reads the canvas's bounding rect + `invShooterX`
  and positions `#nuka-keycap`/`#nuka-cooldown` (now `left/top` +
  `transform:translate(...)` driven, previously static `right/bottom`
  CSS) just to the right of the sprite as it follows the mouse.

## Still open

- Nuka keycap glyph centering (the letter *inside* the keycap box) —
  Adam confirmed the `padding-top:0.09em` nudge from the previous
  session made no visible difference. Needs a fresh look once the
  reposition above is confirmed working, ideally with a screenshot
  since further blind CSS nudges without visual feedback aren't
  reliable.
- `state.js` invader-state duplicate cleanup already done by Codex
  (see `10fd34f`) — confirmed safe, nothing outside `round2.js` read
  those fields.

---

## Documentation Workflow Definitions — 2026-07-03

## Committed & pushed to `main`

- Updated `agent.md` with the project's small-change vs big-change documentation
  rules.

## Files modified

- `agent.md`
- `HANDOVER.md`

## What changed

- Defined a **small change** as something the next assistant can understand
  without extra story: typo fixes, broken doc links, label wording, tiny visual
  tweaks, or obvious dead-code cleanup.
- Defined a **big change** as anything where the next assistant would ask why
  the project behaves that way: gameplay bug fixes, round behavior changes,
  architecture/module wiring changes, new features, removed or moved code,
  startup flow changes, event listener changes, scoring/timing/difficulty/wave/
  cooldown changes, or bug fixes with a root cause.
- Clarified that `HANDOVER.md` should be updated when a change affects gameplay,
  architecture, bug history, testing status, workflow, or future AI
  decision-making. Also use it for extended handoff context, unresolved work,
  complex sessions, or when nearing the end of the active assistant context
  window.
- Updated this file's standing rule so it no longer says every tiny change must
  always receive a handover entry.

## Root cause / workflow issue

- The previous standing instruction treated every change as handover-worthy,
  which created unnecessary documentation overhead and could make the handover
  noisy for non-coding collaborators and future AI sessions.

## Solution implemented

- Added a practical small/big change rule to `agent.md`.
- Mirrored the workflow change in this `HANDOVER.md` entry because it affects
  how future assistants should decide what to document.

## Remaining known issues

- None for this documentation workflow change.

## Follow-up tasks

- Future assistants should apply this rule when deciding whether to update
  `HANDOVER.md` after a pushed change.

---

## Round 2 Nuka Freeze Sync Check — 2026-07-03

## Committed & pushed to `main`

- **`10fd34f`** — Removed stale Round 2/Nuka duplicate fields from
  `state.js` after checking the current JavaScript files against the
  Nuka freeze fix.

## Files modified

- `js/state.js`
- `HANDOVER.md`

## What changed

- Confirmed the actual Nuka freeze fix is present in `js/rounds/round2.js`:
  `invLoop()` now re-checks `state.running`/`invCanvas` immediately after
  `invUpdate()` returns, before drawing or scheduling another
  `requestAnimationFrame`.
- Confirmed `game.js` imports `handleInvaderKeydown` from `round2.js` and
  attaches it during `initGame()`, so Space/Nuka prompt keyboard handling is
  wired through the module graph.
- Removed unused invader/Nuka state copies from `state.js`:
  `invCanvas`, `invCtx`, `invRaf`, invader entity/bullet/particle fields,
  invader config constants, `invWave`, `invUpgrade`, AOE fields, and Nuka
  cooldown/prompt fields.
- `round2.js` remains the active owner of Round 2 runtime state and config.

## Root cause / sync issue

- The Nuka freeze fix was already synced into the active Round 2 engine, but
  `state.js` still contained duplicate invader/Nuka fields left over from the
  modular refactor.
- Those duplicated fields were not read or written by `round2.js`, `game.js`,
  or other modules, which made `state.js` look like a competing source of
  truth even though it was dead data.

## Solution implemented

- Searched the repository for `state.INV_WAVE_CONFIG`,
  `state.INV_BULLET_SPEED`, `state.invRaf`, and
  `state.invNukaSkillActive`; no live references were found.
- Removed the stale duplicates from `state.js` instead of rewiring Round 2,
  preserving the existing working Round 2 module ownership.

## Remaining known issues

- Local browser/dev-server QA was not available in this Codex workspace; user
  will verify through GitHub Pages.
- `READ ME.md` still points to `AGENTS.md`, but the actual repository file is
  `agent.md`. This was observed during session startup and is a small future
  documentation cleanup.
- Round II still needs a full live playtest from Wave 1 through Boss before
  feature lock.

## Follow-up tasks

- Test Round II through GitHub Pages, specifically choosing Nuka at Wave 4 and
  confirming the loop continues after the skill prompt resolves.
- If Round II pacing still feels slow, check `js/rounds/round2.js` directly;
  it is the current source of truth for invader wave speeds.
- Consider correcting the `READ ME.md` project-direction link from
  `AGENTS.md` to `agent.md` in a future docs pass.

---

## Round 2 Nuka Freeze Fix + Cleanup — 2026-07-03

## Fixed, staged (not yet pushed — see Process notes)

- **Round 2 Nuka freeze (open bug #1 from 2026-07-02, now fixed).** Root
  cause: `invLoop()` only checked `state.running`/`invCanvas` at the top
  of the function, before calling `invUpdate()`. But `invUpdate()` can
  itself stop the round mid-call — specifically, clearing wave 4 calls
  `nextInvaderWave()` → `showUpgradeModal()`, which sets
  `state.running=false` and nulls `invRaf` to "kill the loop cleanly."
  Control then returns into the *same* `invLoop()` invocation, which
  didn't re-check anything — it called `invDraw()` and unconditionally
  did `invRaf=requestAnimationFrame(invLoop)`, silently overwriting the
  `null` that was just set. That queued one "ghost" frame; when it fired
  (~16ms later, while the upgrade modal was still up), it saw
  `state.running` was false and returned early — but without resetting
  `invRaf`, leaving it holding a stale, already-fired, non-null ID
  forever. When the player then picked the Nuka upgrade,
  `startNukaSkill()`'s `if(!invRaf) invLoop()` restart check saw a
  non-null `invRaf` and never restarted the loop — permanently freezing
  the render/update cycle while the wave still spawned in memory and the
  (DOM-based, loop-independent) Nuka keycap prompt still displayed,
  matching the reported symptom exactly. Fixed by re-checking
  `state.running`/`invCanvas` immediately after `invUpdate()` returns,
  before `invDraw()`/rescheduling.
- Nuka keycap glyph centering + border, in `index.html`: border thinned
  from `1px solid rgba(255,255,255,0.2)` to `0.75px solid
  rgba(255,255,255,0.14)`; added `line-height:1` + `padding-top:0.09em`
  as a fixed optical-center nudge (flexbox centers by line-box, not
  glyph visual weight, which is why straight vs. curved characters sat
  differently). Note: this is an approximate, uniform nudge — true
  per-glyph centering would need per-character metrics, not attempted.
- Removed the temporary debug label from `invDraw()` in `round2.js`
  (`[debug] wave N · descentSpeed=... · bulletSpeed=...` canvas text),
  flagged for removal since `f889ca3`.
- Docs: `agent.md` and `READ ME.md` architecture sections updated from
  "Single-file `index.html`" to reflect the actual modular `js/` split.

## Known residual, not addressed this session

- `state.js` declares `invNukaSkillActive`, `invNukaCooldownUntil`,
  `invNukaPromptLetter`, `invNukaCooldownTimer`, `invNukaCooldownRaf` on
  the shared `state` object, but `round2.js` never reads/writes them —
  it keeps its own identically-named local closure variables instead.
  Dead/confusing duplication left over from the refactor; worth removing
  from `state.js` in a future pass, but not touched here to keep this
  batch surgical.

## Process notes

- Standing instruction from Adam: **update this file at the end of every
  session by default**, not just when asked — he's running multiple AI
  sessions/devices against this repo, so this file is the only shared
  source of truth between them.
- Adam's stance on the PAT-in-chat push workflow: he's aware pasting a
  token in-conversation exposes it, and is fine with that risk for this
  repo specifically — it's a game/marketing artifact, not a production
  or sensitive system. Still generate scoped, short-expiry tokens and
  revoke after use as a baseline habit, but don't over-flag the
  exposure itself in future sessions.
- This session's edits are sitting in the sandbox only — no GitHub
  connector is available in this chat surface, and pushing needs a
  fresh fine-grained PAT (Contents: Read and write, scoped to this repo,
  shortest expiry) pasted in-conversation for a one-time push, revoked
  immediately after use per the existing rule below.

---

## Round 2/3 Refactor Fixes — 2026-07-02

## Committed & pushed to `main` (live on GitHub)

- **`2b55ab2`** — Fixed `state.js`: it was exporting individually-named
  bindings, imported elsewhere via `import * as state`. That style of
  import is read-only in ES modules — any write to it (`state.currentRound
  = 1`, etc.) threw a `TypeError` immediately. This was the root cause of
  "half the components missing" after the modular refactor. Fixed by
  exporting one mutable `state` object instead, and updating the imports
  in `game.js`, `audio.js`, `ui.js`, `round1.js` to match
  (`import { state } from './state.js'`).

- **`019c5d0`** — Fixed `round2.js` and `round3.js`: both files had **zero
  import statements** — they were copy-pasted from the old single-file
  monolith with no wiring to the other modules (`state.js`, `ui.js`,
  `audio.js`, `game.js`). Every reference to shared values (`running`,
  `combo`, `field`, `msgEl`, `sfxMuted`, etc.) was undefined, throwing
  immediately. Also restored a missing `requestAnimationFrame`
  self-scheduling call at the end of `duelDrawFrame()` in `round3.js` —
  that missing line was the actual cause of the Round 3 freeze (it drew
  exactly one frame and stopped).

- **`fb07ab5` → `f889ca3`** — Pushed from a separate session (different
  device, same project). Wired up the Nuka skill's keyboard input
  (previously missing). Iterated Round 2 wave descent speed up to 4x the
  original pre-refactor baseline. Left a **temporary debug label** on the
  Round 2 canvas showing live `descentSpeed`/`bulletSpeed` values, added
  to confirm the browser wasn't serving a cached version. Marked
  "TEMP DEBUG — remove once confirmed" in its own comment — still needs
  removing.

## Committed & pushed in this same batch

- `state.js`: wave descent speed reduced from 4x → 3x original baseline,
  per request:
  ```js
  const INV_WAVE_CONFIG = [
    {cols: 8, rows: 4, descentSpeed: 0.36, hpTop: 2, hpRest: 1},
    {cols: 8, rows: 4, descentSpeed: 0.54, hpTop: 2, hpRest: 1},
    {cols: 9, rows: 4, descentSpeed: 0.78, hpTop: 3, hpRest: 1},
    {cols: 9, rows: 5, descentSpeed: 1.05, hpTop: 3, hpRest: 2},
    {cols: 10, rows: 5, descentSpeed: 1.44, hpTop: 4, hpRest: 2},
    null,
  ];
  ```

## Open bugs — not yet diagnosed or fixed

1. **Round 2 freezes when the Nuka skill triggers.** Not yet
   investigated — needs a look at `resolveNukaInput` / the
   Nuka-clear-effect logic in `round2.js` (from `fb07ab5`) to find what
   halts the wave loop.
2. **Nuka's on-screen letter prompt** needs the key glyph centered on
   straight characters (not resting on the visual baseline of curved
   ones), with a thinner outline stroke.
3. Remove the temporary debug label added in `f889ca3` once no longer
   needed for diagnosis.

## Process notes for whoever picks this up next

- **Claude sessions do not share live file state across chats or
  devices**, even under the same account. Memory carries over *facts*
  about the project, not working files or in-progress edits. GitHub is
  the actual source of truth between sessions — always `git fetch` and
  check `git log origin/main` before assuming local state is current.
- There is no GitHub connector available in this chat surface. Pushing
  requires manually generating a fine-grained Personal Access Token
  (Contents: Read and write, scoped to this repo only, shortest
  expiry) and pasting it in-conversation for a one-time push. Revoke it
  from GitHub immediately after each session that uses one.
- `README.md`/`agent.md` still describe the architecture as "Single-file
  `index.html`" — that's stale since the modular `js/` split. Worth
  updating so it reflects reality.


 
 
 

