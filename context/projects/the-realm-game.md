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

## Progress snapshot (2026-10-17) — what is done and not done
Full detail and commit hashes: `/HANDOVER.md`. This table goes stale; if it disagrees with HANDOVER.md or the code, the code wins.

| Item | Status |
|------|--------|
| Four boss combos (fokus lina, semic, machina, plasma) | Done, not yet playtested together |
| Boss body, hurt flash, death split, cast telegraph, Pincer Press, hand-to-spike morph | Done (flat 2D boss) |
| Both swipe pincer and Pincer Press in rotation | Done |
| Post-hit invincibility + lower wave damage (B16) | Done |
| Wave damage synced to its visual (B17) | Done |
| 3D engine `js/rounds/boss3d.js` (B18/B19) | Built, **not wired into the game** |
| 3D boss swap-in (B23a), hurt flash and death split per face | Not done, waits for Gate 1 approval |
| Gate 1: Adam approves the 3D look | Pending (crobe v1 shown, v2 planned; see `context/prototypes/crobe/`) |
| Crobe (cowl + robe) boss design | Prototype v1 only |
| Pincer Press polish: hands fly back and reattach, body hands hidden while detached, wind-up/swing/return timeline | Not done |
| Boss attack SFX (pincer, press, teleport landing) | Not done, waiting on audio specs |
| SFX eccentricity pass (`playBulletFire`, `playMissileFire`) | Not done, waiting on audio specs |
| Wave VFX `playbackRate` sync | Not done |
| Stylised upgrade buttons | Not done, needs Adam's style direction |
| Gate 2, batches B20-B26 | Details never recorded. Rebuild the batch plan from HANDOVER.md before shipping |
| Playtest of all four combos, 3D frame cost on the 60Hz phone | Not done |
