# AGENTS.md

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

## Architecture

* Single-file `index.html`.
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
