# The Realm — product requirements

**Status:** working draft · **Owner:** Adam · **Updated:** 2026-10-18

This is the living product brief for The Realm. It records the intended player experience, current scope, release gates, and decisions still needed. It does not authorize implementation. For actual behavior, inspect the code; for recent work and verification, read `HANDOVER.md`. `PROJECT.md` is a shorter status snapshot, and `DESIGN.md` contains design principles and some older mechanic descriptions.

## 1. Purpose

The Realm is a minimalist, three-round browser game. Its recorded brand role is an initiation and qualification gate. The experience should reward observation, positioning, and timing while keeping a single restrained visual identity across distinct rounds. The player journey ends at a time-limited portal presented after completing the game.

The game should feel deliberate, readable, and skill-based. Its interface uses sparse copy, negative space, strong silhouettes, and restrained motion and sound.

## 2. Audience and player journey

**Intended player:** a visitor entering The Realm from a shared link or brand touchpoint. Audience segments, acquisition targets, and expected traffic are not yet defined in this public PRD.

1. A new or eligible visitor reaches the welcome screen and begins.
2. Round I tests perception through seven observation and form-identification questions. Five correct answers pass. A failure starts a local 24-hour lockout and presents a tracing puzzle before re-entry.
3. Round II is a wave-based invader game with weapon choices and a boss encounter against the Conformarult.
4. Round III is a duel built around timing and pressure; Gambler's Gambit is its climax.
5. Completion reveals a portal with a QR code and countdown.

The sequence above reflects the current code and repo notes. End-to-end behavior, especially on a phone, still needs playtest evidence.

## 3. Product requirements

| ID | Requirement | Acceptance evidence |
| --- | --- | --- |
| R1 | A visitor can start the game and move through all three rounds in order. | A complete browser playthrough reaches the portal without a dead end or unintended reload. |
| R2 | Round I presents seven questions, tracks the result, advances on at least five correct answers, and applies the documented failure/lockout flow otherwise. | Pass and fail paths are exercised in a browser; lockout and re-entry behavior are observed after reload. |
| R3 | Round II presents distinct, readable projectiles, upgrades, wave progression, and the boss encounter. | A full Wave 1-to-boss run verifies each available upgrade route, input, cooldown, damage feedback, and transition. |
| R4 | Round III preserves the timing-focused duel and one-time Gambler's Gambit. | A complete duel verifies input, feedback, win/fail paths, and the transition to the portal. |
| R5 | Important state changes are legible without adding interface clutter. | Players can identify current round, actionable prompt, health/progress, upgrade choice, and outcome during moderated playtest. |
| R6 | The game remains usable on its intended phone and desktop browsers. | Test the full journey with touch and keyboard/mouse, including viewport sizing, audio controls, and frame stability. Target devices and browsers must be named before release sign-off. |
| R7 | Completion and lockout states behave as intended across reloads. | Verify the portal timer, QR display, local lockout persistence, and reset behavior in the chosen browsers. |

These are product acceptance criteria, not claims that the current build passes them.

## 4. Current state and release gates

| Area | Recorded state | Remaining gate |
| --- | --- | --- |
| Round I | Perception gate implemented. `PROJECT.md` calls it feature locked, but also says HUD polish has not been playtested. | Verify pass/fail and HUD on target devices. |
| Round II | Core wave and boss play are present. `PROJECT.md` calls it feature complete but not locked. Recent `HANDOVER.md` records additional boss work and pending combination playtests. | Full Wave 1-to-boss playtest, including all four boss weapon combinations and failure/retry paths. Fix observed defects before feature lock. |
| Round III | Recorded as feature complete and locked. | Confirm the end-to-end transition to the portal during release QA. |
| Boss visual direction | A pure-canvas fake-3D engine exists, but the 3D boss is not wired into the live game. Crobe v1 is a prototype. | Adam's Gate 1 visual approval and a scoped implementation/phone-performance check before any swap. |
| Global polish | Deferred. | Begin only after Round II feature lock. |

`PROJECT.md` and `DESIGN.md` include older descriptions of Round I and Round II. In particular, current `round1.js` implements a perception quiz rather than the older mole/combo loop. Reconcile those documents against the code before treating their mechanic details as current requirements.

## 5. Design and technical constraints

- Preserve the existing vanilla HTML/CSS/JavaScript module structure and current gameplay unless a change is explicitly approved.
- Keep the interface minimal: lowercase, short copy, negative space, and feedback through silhouette, animation, sound, and restrained color.
- Make projectile types and boss attacks distinguishable during play, including under heavy combat.
- Keep Round I, II, and III ownership boundaries clear. The Round II boss visual prototype is not a shipped feature.
- Do not put private brand operations, access logic, or unreleased product details into this public repository.

## 6. Out of scope for the current release gate

- New rounds or new gameplay mechanics.
- A framework migration or broad rewrite.
- Crobe 3D boss integration before Gate 1 approval.
- Global visual polish before Round II feature lock.
- Brand funnel, commerce, and community operations; those are maintained outside this public PRD.

## 7. Decisions and questions to resolve

1. **Release target:** Which devices and browsers define a pass, especially for the 60 Hz phone mentioned in `HANDOVER.md`?
2. **Completion criterion:** Is reaching the portal enough for the first release, or must the QR destination be verified end to end?
3. **Round II lock:** What playtest evidence will Adam accept to declare feature lock after the four combination runs?
4. **Boss visual:** Gate 1 remains pending. The 3D swap is a separate decision after reviewing the next crobe prototype.
5. **PRD scope:** Should this brief eventually cover the wider brand journey, or remain a game-only public document? Keep sensitive operations outside the repo either way.

## 8. Update rule

When a product decision changes, update this PRD and cite the decision in `HANDOVER.md`. When implementation changes, reconcile the relevant requirement and acceptance evidence with the current code. Keep **planned**, **implemented**, and **playtested** distinct.
