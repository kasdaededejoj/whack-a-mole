# [ChatGPT] Whole-game analysis — 2026-10-21

Requested by Adam in you'xi: “analyse the entire game first, and tell me what you see.” Analysis and diagnosis only; gameplay remains in LD. Source baseline: `615c434f229b1bd9fd5242050e7fead3201366a5`. No gameplay, audio, renderer, balance, or deployment changes were made for this review.

## Judgment

The game has a recognizable visual identity and a plausible initiation arc: attention, confrontation, then a threshold. Round II has the most developed mechanical progression. The larger problem is whether the rules produce a fair, understandable qualification experience. Several current defects also prevent reliable judgments about difficulty. **8/10 — interpretation from source inspection and partial browser observation, not player research or founder acceptance.**

The game expresses mysticism and confrontation clearly. Whether its tests select people who connect with ???, or teach the intended perception, remains unproven. The teach-versus-filter decision is still open. **9/10 — recorded intent and evidence limits; no new product decision.**

## Coverage and evidence

- Inspected entry, gate, orchestration, all three round systems, input routes, upgrade/boss paths, rendering sections, UI, state, audio, developer controls, supporting utilities/effects, HTML/CSS, the isolated fake-3D module, crobe documentation, PRD, and current handover. This is system-wide review, not a claim that every asset or code path has been exercised. **9/10.**
- All 13 JavaScript modules passed Node syntax checks; their relative import targets exist. These checks establish parseability and file presence only. **10/10 — automated checks.**
- Five focused defect reproductions ran actual source in temporary in-memory Node VM contexts with mocked DOM/timers/audio/import dependencies. No test files were installed in the repo. Their limits are stated below. **10/10 — isolated execution, not browser proof.**
- The documented public GitHub Pages URL displayed “There isn't a GitHub Pages site here” / 404 in the browser. Cause and hosting configuration were not investigated. **9/10 — observed in this environment at review time.**
- Local source was served only on `127.0.0.1:8765`. Browser observation covered welcome, a successful seven-question Round I sequence using source-informed answers, the transition into Round II, idle Round II failure returning to welcome, developer jumps into Round II/Round III/portal, and a Round III guard/standoff turn returning to choose. Developer jumps do not prove normal progression. **9/10 — observed local behavior.**
- Layout inspection included measured CSS viewports of 390×844 and 1280×800; no document horizontal overflow was observed in the inspected phone duel and desktop entry states. Browser viewport settings were restored. Real phone touch, safe-area hardware behavior, and refresh-rate performance remain untested. **9/10.**
- No full Wave 1-to-boss combat run, four-combination playtest, complete duel win/loss run, actual QR scan/destination verification, lockout expiry/tracing walkthrough, audio listening assessment, or deployed gameplay verification was completed. **10/10 — coverage statement.**

## Current experience

```text
welcome
  ├─ persisted local lockout → countdown / hidden tracing bypass
  └─ begin
       → I: 4 form choices + 3 observation questions; 5/7 passes
       → II: 5 invader waves → Conformarult
               choices after waves 2 and 4 → combination before boss
       → III: strike / guard / health-gated void
       → timed QR portal → welcome
```

**9/10 — source-backed intended route; the defects below affect its actual enforcement.**

| Area | What works / what the player is asked to do | Concern | Confidence and evidence |
| --- | --- | --- | --- |
| Entry | One begin action, sparse language, custom typography and a subdued figure establish a consistent atmosphere. | No ordinary pause or audio controls are exposed; audio controls live in the hidden developer panel. | 9/10 — browser observation plus `index.html`, `homepage.js`, `devpanel.js`. |
| Round I | Observation asks about count, asymmetry and simultaneous appearance; progress dots and immediate answer feedback exist. | Four “identify the form” questions use an undisclosed real/noise symbol list. No in-game reference establishes why one is real. The old score/misses/combo HUD remains visible and static. | 10/10 — `round1.js:16`, `round1.js:227`, `game.js:35`; HUD also observed. |
| Round II | Pointer movement/fire, escalating waves, two upgrade choices, combinations, boss teleports, two pincer attacks, phase-two waves, HP and hit feedback give the most developed combat system. | Correctness defects below, refresh-rate dependence, and fixed pixel weapon widths complicate difficulty assessment. | 9/10 — source inspection; combat balance and all combinations not browser-verified. |
| Round III | A small outcome matrix, unequal HP pools, later void availability, action animations and a one-time gambit create a final confrontation. | Enemy actions are sampled after the player's choice, with HP-dependent weights and no action-specific tell. A turn takes about 3.3 seconds before another choice. The gambit automatically replaces ordinary resolution at exactly one HP. | 10/10 — `round3.js:11`, `round3.js:136`, `round3.js:193`, `round3.js:237`. |
| Portal | The reveal and expiry act as a final threshold. | The external QR image failed to load locally; no clickable same-device continuation exists. Its destination and operational access rules are unverified. | 9/10 — browser image `complete=true`, `naturalWidth=0`; `index.html:1284`; no cause inferred. |

## Confirmed correctness defects

Priorities below are recommendations for a future scoped task, not authorization or a replacement for the missing B20–B26/Gate 2 plan.

| ID | Priority | Trigger and actual result | Evidence | Confidence |
| --- | --- | --- | --- | --- |
| G01 | High | Round II reaches 120 seconds while enemies are alive. The general round timer calls `endRound()`, which treats invaders as passed and starts Round III. Upgrade selection also leaves this timer running. | `js/game.js:21`, `js/game.js:65`, `js/game.js:93`; VM execution of `startRound(1)`, timer expiry and transition produced `currentRound=2`, `startDuel` called, without a wave kill. | 10/10 — source + isolated reproduction; wall-clock browser reproduction not completed. |
| G02 | High | A boss wave reaches its stored cast-time target after the player has moved away. Collision uses `s.tx/s.ty`, rather than the current shooter position. | `js/rounds/round2.js:835`; VM wave near x=100, player at x=900, yielded player HP 80 from 100. Damage is still subject to invulnerability and wave lifetime. | 10/10 — source + isolated reproduction. |
| G03 | High | Choose beam + rapidaaa → plasma, then hold fire. The handler enters the older beam branch and returns; `firePlasma()` has no caller. | `js/rounds/round2.js:992`, `js/rounds/round2.js:1107`, `js/rounds/round2.js:1196`; VM recorded only a 450ms beam interval and zero plasma bullets. | 10/10 — source search + isolated input-route reproduction. |
| G04 | High | Fail Round I. Its failure callback invokes the shared `endRound()`, which considers the old `mole` type passed. Cleanup erases the failure message and schedules Round II at the same 1800ms delay as the reload. | `js/rounds/round1.js:283`, `js/game.js:56`, `js/game.js:94`; VM produced two 1800ms timers, transition label `——`, and an emptied field. This proves conflicting transitions; it does not prove a durable lockout bypass. | 10/10 — source + isolated reproduction. |
| G05 | High | A duel clash kills the enemy while reducing the player from two HP to one. Gambit runs before the victory check. Its losing branch then sets player HP to zero, overriding that killing blow. | `js/rounds/round3.js:237`, `js/rounds/round3.js:259`, `js/rounds/round3.js:288`; VM reproduced enemy HP zero with gambit active, then both HP zero after the losing branch. | 10/10 — source + isolated reproduction. |

## Other source-backed risks and gaps

**Round I meaning and fairness — 9/10, design inference grounded in `round1.js`.** The observed rules support testing short-term observation. The four authentication questions additionally test knowledge of the author's undisclosed symbol set, guessing, or learning through answer feedback. Under the explicit hypothetical assumptions of all three observations correct and independent uniform guessing on each form question, the chance of passing is 40.74%. This is a probability calculation, not measured player behavior or evidence of audience fit. A 24-hour penalty therefore needs an intentional rationale. Discovery can remain sparse while the correct distinction is made inferable; the implementation choice belongs to Adam.

**Combat timing and device differences — 10/10 source, 8/10 inferred impact.** Descent, bullets, boss movement, attacks and the 60-frame invulnerability window advance per animation frame, while firing intervals and several effects use elapsed milliseconds (`round2.js:125`, `round2.js:1123`, `round2.js:1482`). At different refresh rates these systems change relative to one another. Beam widths are fixed at 113/280 pixels across screen widths (`round2.js:1209`, `round2.js:1252`). Real device difficulty and frame stability need measurement before balance changes.

**Boss feedback — 10/10 source.** Boss HP is scaled by `313 × 1.5^upgradeCount`, but several textual hit readouts retain `/ 313`; the canvas HP ratio uses `maxHp`. This gives inconsistent displays (`round2.js:466`, `round2.js:1608`, `round2.js:2553`). Some kill routes set the death-split animation and others simply mark the boss dead, so the planned shared visual finish is not consistently invoked.

**Wave visual timing — 10/10 source, runtime effect untested.** The video and physical wave launch after the charge together, but physical movement advances per frame while the video travels using `performance.now()` and an assumed 60fps travel calculation. Playback rate is never set. Matching launch time does not establish continuing visual/collision alignment (`round2.js:654`).

**Duel agency — 9/10 source, 8/10 design inference.** Choices affect outcomes, so the duel is not pure chance. However, the opponent's next action is hidden and sampled from weighted randomness after commitment. The current interaction offers statistical learning and risk choice rather than reaction timing. Gambit's automatic 40% win / 60% loss at one HP can dominate the climax, and two-damage attacks can skip the trigger by going directly to zero (`round3.js:136`, `round3.js:237`). Whether that fatalism is desired remains a founder decision. A source comment mentions guard/guard recovery, but no recovery is applied in the resolver.

**Input and accessibility — 9/10 source and DOM inspection.** Round I/III use native buttons; Round II uses pointer events and capture, with no live keyboard movement/fire route. No ordinary pause, reduced-motion branch, or announced canvas combat state was found. At the measured phone duel viewport the action buttons were about 42.6 CSS pixels high. Safe-area CSS exists, but physical-phone input and usability have not been established.

**Audio control consistency — 10/10 source; listening not tested.** Main procedural SFX use `sfxVolScale`; Round III's separate SFX engine checks mute but bypasses that volume scale. `playPortalDrone()` checks neither setting. BGM is a recorded MP3 and thud audio is sample-based; other effects are procedural, so the project summary's blanket “no sample files” is inaccurate (`audio.js:20`, `state.js:11`, `round3.js:28`, `game.js:123`).

**Developer controls — 10/10 source, partial browser observation.** The live Round II overlay calls `.toFixed()` on missing `effectiveBulletSpeed`; its Round I fields still expect the removed mole system. Developer pause/resume does not preserve round timer state, and several delayed round/duel callbacks lack session cancellation. Opening the panel cannot be treated as a reliable pause for QA. The portal jump also leaves its submit button hidden when the panel is reopened; keyboard entry still worked in the browser. These are QA-tool issues, not proof of ordinary player-path failures (`devpanel.js:21`, `devpanel.js:56`, `devpanel.js:69`, `devpanel.js:125`).

**Access and deployment — 9/10.** Lockout is browser-local storage with an intended tracing bypass. The developer shortcuts and client-side portal are shipped in the same source. They do not establish secure identity or one-time access enforcement. That may be acceptable as a narrative gate; private operations and actual downstream controls were outside this review. The public URL's observed 404 and local QR failure need separate availability checks before anyone is told the full access journey works.

**Architecture and documentation — 9/10.** Vanilla modules and per-round files provide a workable structure. Shared state plus duplicated duel fields, round-specific cleanup inside global transitions, older weapon routes, stale labels and uncancelled callbacks show accumulated integration debt. No automated test suite or CI configuration was found in the inspected checkout. `PROJECT.md` and parts of the progress summary describe superseded mechanics; current source and this review take precedence for the examined behavior. A broad rewrite is not justified by these findings.

## Recommended next sequence

1. Scope a correctness batch for G01–G05, preserving existing intended mechanics except where Adam must decide resolution precedence. Verify pass/fail/retry and transitions with focused checks.
2. Make the developer controls dependable enough to support evidence gathering; establish target device/browser/refresh-rate conditions and verify the QR destination/availability in the appropriate private scope.
3. Observe first-time players on Round I, all four Round II builds, and a complete duel. Evaluate what they can infer, why they fail, and whether repeated attempts feel intentional.
4. Resolve the product meaning of authentication and Gambit using those observations. Review crobe visuals and the missing batch plan separately; Gate 1 approval and Gate 2 remain unrecorded/pending as previously documented.

**8/10 — proposed execution order, awaiting Adam's task selection and any required design decisions.** New aesthetics, the 3D swap, and a broad polish sprint should not be treated as already approved by this analysis.

## Browser evidence artifacts

Local screenshots are outside the repository in the you'xi visualization folder:

- `C:\Users\basel\.codex\visualizations\2026\10\20\01a158f1-2e90-7d63-af9b-804d5afda98c\realm-portal.png` — developer portal preview with failed external QR image; not an earned-completion playthrough.
- Same folder, `realm-entry-desktop.png` — local entry at measured 1280×800 CSS viewport.

Browser screenshot rendering/scale is environment-specific; measured CSS dimensions came from DOM inspection. These artifacts establish the observed local screen states only. **9/10.**
