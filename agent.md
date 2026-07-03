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
project direction. Use `HANDOVER.md` mainly for extended handoff context,
complex session notes, unresolved work, or when nearing the end of the active
assistant context window.

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
