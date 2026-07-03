# Handover — The Realm

> **Standing rule:** update this file after every change made in any
> session — new fixes, new bugs found, anything left uncommitted, and
> any process notes worth passing on. Treat it as the shared memory
> between sessions, since Claude chats don't share live state with each
> other (see "Process notes" at the bottom). Keep old entries; add new
> ones under a dated heading rather than overwriting history.

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
