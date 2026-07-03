# agent.md

## Project Rules

The Realm is intentionally minimal.

When modifying the project:

* Refactor before rewriting.
* Preserve architecture.
* Extend existing systems.
* Avoid duplicate logic.
* Reuse existing rendering functions.
* Preserve gameplay unless explicitly instructed.

---

## Canonical Documentation

This repository intentionally uses these documentation filenames:

* `READ ME.md` — project overview and setup orientation.
* `agent.md` — AI/developer implementation rules.
* `PROJECT.md` — current project status and milestones.
* `HANDOVER.md` — long-running handoff notes when needed.

Do not assume `README.md` or `AGENTS.md` exists. If another AI asks for those
files, read `READ ME.md` and `agent.md` instead unless the repository has been
renamed.

For every change pushed to GitHub, update `READ ME.md`, `agent.md`, or
`PROJECT.md` when the change affects setup, architecture, workflow, status, or
project direction.

Use this rule for `HANDOVER.md`:

* Small changes do not need a handover entry unless they alter workflow or
  future AI decision-making. A small change is something the next assistant can
  understand without extra story: typo fixes, broken doc links, label wording,
  tiny visual tweaks, or obvious dead-code cleanup.
* Big changes should receive a handover entry. A big change is anything where
  the next assistant would ask why the project behaves that way: gameplay bug
  fixes, round behavior changes, architecture/module wiring changes, new
  features, removed or moved code, startup flow changes, event listener changes,
  scoring/timing/difficulty/wave/cooldown changes, or bug fixes with a root
  cause.
* In short: update `HANDOVER.md` when a change affects gameplay, architecture,
  bug history, testing status, workflow, or future AI decision-making. Also use
  it for extended handoff context, unresolved work, complex sessions, or when
  nearing the end of the active assistant context window.

---

## Architecture

* Modular vanilla JS: `index.html` (markup/CSS) + `js/` (state.js, game.js,
  ui.js, audio.js, effects.js, devpanel.js, homepage.js, utils.js,
  js/rounds/round1.js, round2.js, round3.js).
* `state.js` exports a single mutable `state` object — import it via
  `import { state } from './state.js'`, never `import * as state`.
* Vanilla HTML/CSS/JavaScript.
* No frameworks.
* No unnecessary abstraction.

---

## Implementation Rules

Always:

1. Locate existing implementation.
2. Understand it.
3. Extend it.
4. Preserve event flow.
5. Preserve save/load behaviour.
6. Remove dead code after refactoring.

Never replace a working system unless instructed.

---

## Design Philosophy

Gameplay first.

90% empty space.

Minimal HUD.

Elegant typography.

Motion over visual noise.

Identity through silhouette before colour.

Subtle feedback over flashy effects.

Every addition should justify its existence.

---

## Gameplay Rules

Do not change gameplay balance unless ticketed.

Do not introduce mechanics outside the current sprint.

Do not redesign completed systems.

Prefer refinement over expansion.

---

## AI Behaviour

If uncertain:

Stop.

Report assumptions.

Do not invent missing systems.

Do not silently skip tickets.

State blockers clearly.

---

## Coding Standards

Prefer existing variables.

Prefer existing renderers.

Avoid duplicated event listeners.

Avoid duplicated CSS.

Maintain performance.

Keep the project readable.
