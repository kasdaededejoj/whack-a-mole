# PROJECT BRIEF: The Banal Stealth Brand

## Brand Philosophy & Architecture
* **Identity:** Stealth avant-streetwear brand based in Singapore. Solo founder.
* **Positioning:** Between luxury stealth (The Row, Bottega Veneta) and avant-garde (Rick Owens, Julius, Yohji Yamamoto).
* **Core Philosophy:** "Banal" — Being true to oneself, developing independent taste, observing rather than blindly consuming. Curiosity is the common thread.
* **Structure:** Not a community-first brand. Direction remains centralized (founder-authored), interpretation remains decentralized. The audience is encouraged to observe and discover.
* **Strongest Asset:** A recognizable lens for observing the world. Clothing, music, references, graphics, and games are all expressions of that lens.

## Unresolved Strategic Tension
* **Core Conflict:** Whether touchpoints (game, Discord, drops) are *educational systems* (taste cultivation) or *marketing systems*. This distinction is unresolved.
* **AI Directive:** Push back on this whenever brand infrastructure decisions arise.

## Current Project: Whack-a-Mole Discovery Mechanic
* **Role:** One acquisition funnel among several to acquire, qualify, and retain the correct audience.
* **Flow:** Welcome → Whack-a-Mole (easy) → Void Invaders (5 waves) → The Void Duel → Portal (QR) → Discord Realm.
* **Mechanics Philosophy:** Reward observation, discernment, and attention over raw reaction, optimization, or speed. Embed philosophy inside gameplay. Do not over-intellectualize or make gameplay feel like homework.
* **Local Path:** `D:\iter v2\presence, (new marketing)\predece'a\ypu'xiest\charades\`
* **Deployment:** Single `index.html` file — no database, no backend. All state is held in JavaScript runtime memory (resets on refresh). Deployable to GitHub Pages by pushing the repo and setting Pages source to `main` branch root.

## Game Architecture — Current State
* **Single file:** `index.html` contains all HTML structure, CSS styles, and JavaScript logic inline. No external JS files, no database.
* **Assets referenced (local):** `BLKCHCRY.TTF`, `ThestralNeue-Bold.otf`, `the true citadel.mp3`, `thud sfx, 1st iteration.mp3`
* **Assets referenced (Imgur / temporary):** Mole decoy images × 4, QR code image — flagged for replacement with own assets.
* **Dev Panel:** Password `1221`, triggered by `Shift+D`. Allows round-skipping and audio control.

## Round Summary — Implemented Mechanics

### Round 1 — Whack-a-Mole
* Max 3 moles on screen at once. 30s timer. Pass threshold: 1749pts.
* **Purpality targets** (formerly `void-target`): 18% spawn chance, 40px size, 0.43× speed ratio (disappear faster), 3× point multiplier, +2 combo per hit.
* **Noise targets:** 15% spawn chance. Hit = −50pts, combo reset, thud SFX plays, chromatic aberration (R/G/B layers) animates on appear, reverses on disappear. CSS classes: `.ca-r`, `.ca-g`, `.ca-b`.
* Combo system: ×1–×8. Score = 10 × combo × ptsMult.

### Round 2 — Void Invaders (5 Waves)
* Canvas-based space invaders. Glyph enemies descend in waves.
* **Wave progress bar:** 5 segments, fills left to right per wave. Colors: `#e8d87a` → `#b89a60` → `#7a5080` → `#4a2060` → `#3a0060`.
* **No transition overlay between waves** (removed from earlier build).
* **Upgrade modal appears after wave 2 clears.** Player chooses:
  * `rapid fire` — fire rate halved (120ms → 60ms)
  * `void missile` — AOE missile every 3s, **10px explosion radius**, targets random live entity
* Chosen upgrade persists through all remaining waves.
* Wave 5 is a Boss wave (`???`, 57HP, drifts side-to-side).
* AOE missile rendered with purple-tinted tip (distinct from standard bullet).

### Round 3 — The Void Duel
* Turn-based: Strike / Guard / Void. Player 8HP vs. Void 16HP.
* Outcome matrix with SFX per action (procedural Web Audio).
* **Gambler's Gambit:** Appears when `duelPlayerHP === 1`. Large pulsing button.
  * On click: SVG turbulence filter tears the screen for 1.2s.
  * **40% → instant win** (skip to portal). **60% → instant death.**
  * Disabled/hidden outside of HP === 1 condition.

## AI Instructions & CTP Mode
* **Critical Thinking Partner (CTP):** Default ON.
  * Structure: 1) Acknowledge 2) Strengths 3) Weaknesses (equal weight) 4) Assumption audit 5) Improvement vector 6) Implication challenge.
  * Pushback is non-negotiable. NO auto-agreeing, flattery prefixes, or sugarcoating.
* **Response Style:** Chunk all responses (max ~5 lines per paragraph). Use structure (Observation, Implication, Risk, Recommendation, Open Questions).
* **Critical Rule:** Challenge the founder when they romanticize complexity. Favor Simple, Maintainable, Compounding over Complex, Fragile, Maintenance-heavy.
* **Session Management:** Warn at ~90% context limit. Provide full handover summary before cutoff.

## Pending / Next Steps
* [ ] Test AOE 10px radius — assess whether it feels impactful or underpowered vs. rapid fire.
* [ ] Test Gambler's Gambit visual tear and resolution.
* [ ] Lottie VFX integration for void slash (AE file being built by founder).
* [ ] Replace Imgur mole decoys and QR code with own assets.
* [ ] Mobile touch support for Invaders and Whack-a-Mole.
* [ ] Test wave 2–5 descent speeds (tune as needed).
* [ ] Written submission form via Carrd (separate from game).
* [ ] Custom SFX integration when files are ready.
* [ ] Consider splitting `index.html` into `index.html` + `style.css` + `game.js` for maintainability.

---

## Changelog

### 2026-06-17 — Session with Antigravity (Gemini / Claude)
**Round 1**
- Renamed CSS class `void-target` → `purpality`
- Purpality size: 80px → 40px
- Purpality speed ratio: 0.65 → 0.43 (disappears faster)
- Noise hit: now plays thud SFX (was playMiss/reverse). Chromatic aberration overlay added (`.ca-r`, `.ca-g`, `.ca-b` divs appended per noise mole). Reverse shimmer animation on disappear via `.disappearing` class.

**Round 2**
- Removed inter-wave round transition overlay
- Added 5-segment wave progress bar (`#wave-bar-wrap`) below time bar
- Wave colors defined: `WAVE_COLORS = ['#e8d87a','#b89a60','#7a5080','#4a2060','#3a0060']`
- Upgrade modal added (`#upgrade-modal`): triggers after wave 2 clears, persists until choice made
- Upgrade: rapid fire (60ms fire rate) or void missile AOE (every 3s, 10px radius)
- AOE missile: purple tip, flies toward random live entity, explodes at `targetY` with `Math.hypot` proximity check (radius 10)
- AOE timer correctly wired through `startInvaders()` and `stopInvaders()`

**Round 3 — Duel**
- Player HP changed: 5 → 8
- Gambler's Gambit button (`#gambit-btn`) added to duel UI
- Gambit visibility tied to `duelPlayerHP === 1` inside `duelUpdateBars()`
- SVG filter `gambit-glitch-filter` added (turbulence + fractal noise + displacement)
- Gambit click: locks buttons, applies filter to duel screen for 1.2s, resolves 40% win / 60% death
- Win: `duelEnemyHP = 0` → `duelEnd(true)`. Death: `duelPlayerHP = 0` → `duelEnd(false)`
