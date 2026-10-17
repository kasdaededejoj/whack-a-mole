# The Realm (browser game)

**What:** a browser-based whack-a-mole / space-invaders hybrid. It is the brand's discovery and gatekeeping mechanic.
**Live:** https://kasdaededejoj.github.io/whack-a-mole/  **Repo:** `kasdaededejoj/whack-a-mole` (deploys from branch `main`, no Actions).
**Source of truth for status:** `/HANDOVER.md` in the repo root. Read it before touching code; this file is only a summary and goes stale.

## Stack
Vanilla JS ES modules, canvas rendering, Web Audio procedural SFX (no sample files), WebM VP9 for wave VFX.

## Round 2 (invaders + boss "Conformarult")
- Weapons: wave 2 pick (`rapida` or `beam`), wave 4 pick (`dua beam` or `rapidaaa`).
- Boss combos: beam+dua beam = fokus lina; rapida+dua beam = semic; rapida+rapidaaa = machina; beam+rapidaaa = plasma.
- Boss attacks: teleport, swipe pincer, Pincer Press (detached hands), travelling wave (phase 2).
- Fake-3D boss engine exists in `js/rounds/boss3d.js` (pure canvas) but is not wired into the game yet.

## Decisions on record
- Keep both swipe pincer and Pincer Press.
- Fake 3D in pure canvas, no library; thorough plan first.
- Post-hit invincibility plus lower wave damage; wave damage starts when its visual starts.
- Boss design direction: "crobe" (cowl + robe), three stacked robe bands with seams, pale mask in the cowl. Planned, not built.
- Boss attack SFX and SFX eccentricity pass are done by a separate audio-focused AI; the builder only wires delivered specs into `js/audio.js`.

## Scope discipline
Different agents own Round 1, Round 2 and Round 3. Stay inside your round.
