# Handover — The Realm

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


 
 
 
