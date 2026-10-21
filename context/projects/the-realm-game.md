# The Realm (browser game)

**What:** a minimalist three-round browser game: perception questions, invader combat, then a turn-based duel. The repo name and older notes refer to the former whack-a-mole Round I. Its brand role is described in `BRAND.md` (section 8).
**Requirements and workflow:** `/PRD.md` records brand purpose, game requirements, current/planned scope, and acceptance evidence; `/SKILL.md` records Adam's current modes, collaboration workflow, and brand style. Updated 2026-10-21; the latest review includes partial local browser observation, not release acceptance.
**Documented public URL:** https://kasdaededejoj.github.io/whack-a-mole/ (404 observed in the review browser; hosting cause unverified). **Repo:** `kasdaededejoj/whack-a-mole`.
**Source of truth for status:** `/HANDOVER.md` in the repo root. Read it before touching code; this file is only a summary and goes stale.

## Latest review — [ChatGPT], 2026-10-21

Read [the whole-game analysis](../reviews/game-analysis-2026-10-21.md) before planning fixes. Source inspection and isolated execution found progression, wave collision, plasma input, Round I failure-transition, and duel victory/Gambit defects. The four combination names and supporting code do not establish four functioning builds. The public URL returned a GitHub Pages 404 in the review browser; the local external QR image also failed to load. Causes and downstream access remain unverified.

Local browser coverage was partial: entry, source-informed Round I pass into Round II, idle Round II failure, a duel turn via developer jump, and portal preview. Full combat, complete duel outcomes, real phone/refresh-rate testing, tracing/expiry, audio listening, and deployed gameplay remain untested. No gameplay changed; LD and existing gates remain in force. Earlier “done” entries below are historical snapshots, not current acceptance evidence.

## Stack

Vanilla JS ES modules, canvas rendering, Web Audio procedural SFX plus recorded BGM/thud audio, WebM VP9 for wave VFX.

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
