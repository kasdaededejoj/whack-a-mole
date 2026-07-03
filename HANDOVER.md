# Handover — Round 2/3 Refactor Fixes

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
