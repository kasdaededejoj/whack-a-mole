# ??? and The Realm — product requirements

**Status:** working draft. **Owner:** Adam. **Updated:** 2026-10-21.

This document records the brand purpose relevant to The Realm, the current game, planned work, acceptance evidence, and unresolved decisions. It does not authorize implementation. The game remains in LD: plan and diagnose; no gameplay shipping until Adam authorizes it.

## 1. Who we are

??? is Adam's perma-stealth, invite-only avant-streetwear brand. The name is deliberately withheld. Its recorded ambition is a taste institution expressed through fashion, music, archives, essays, a game, and community.

Its positioning references sit between luxury stealth (The Row, Bottega Veneta) and avant-garde (Rick Owens, Julius, Yohji Yamamoto). These describe the intended territory; the brand does not claim to be a luxury house, hype streetwear, vintage, goth, or a cult.

Adam describes its purpose as a realm that facilitates the growth of banality and unconventionalism with fashion. Banality means being comfortable with interests others may find ordinary or boring because they matter to you. Unconventional interests can coexist with ordinary ones; the brand does not demand difference for its own sake.

The philosophical arc is liberation from irrelevant social authorities, arrival at ordinary life with interior conviction, and deep appreciation. Adam links banality to Eigentlichkeit/authenticity. The stance is "we just are", rather than claiming superiority or an invented identity.

Its three-part archetype is **normality, mysticism, unconventionalism**, connected by curiosity. Direction is founder-authored; audience interpretation is open. Discovery, nuance, and appreciation matter more than mass visibility. Touchpoints should feel like a museum, archive, or editorial publication.

These are recorded founder intentions, not evidence that the current game or community achieves them. Detailed source: [BRAND.md](context/BRAND.md).

## 2. Product purpose and audience

The Realm is a minimalist browser game and a qualification/initiation experience within the wider brand. Completing it is intended to earn an access opportunity through a QR portal. The Realm also names the wider brand/community world; the game is one part of that world.

The recorded audience includes people who appreciate fashion and value being themselves irrespective of others' opinions. Precise audience segments and recruitment targets have not been defined in this PRD.

**Open strategic question:** does the experience teach perception, filter for affinity, or do both in sequence? The latest recorded lean is filter first, then teach inside; it is not final. Completing the game is a behavioral proxy and does not establish brand affinity by itself.

Adam explicitly reaffirmed that this tension must be examined when infrastructure decisions arise. The latest summary contains both "teach-then-filter" and "filter first"; it does not settle a new order. Evaluate the purpose of each touchpoint instead of treating the sequence as approved.

Sensitive operations are documented in a separate local private PRD supplement outside GitHub. Their presence in a handover does not verify their implementation. Do not copy that supplement into this repository.

## 3. The Realm — 3D entrance revamp

**Status:** founder-directed product requirements in LD; not implemented. **Recorded by:** [ChatGPT], 2026-10-21. Engine selection and specific scenes remain proposals.

### 3.1 Experience and continuity

Adam wants a shadowy entrance that invites investigation. Visible round framing should go; internal rounds/stages remain for tracking, with a clear linkage between every stage. A trace leading somewhere and artifacts concealing something are primary; a presence noticing the visitor is secondary. **Founder direction, not implemented.**

The specific encounter, transitions, references and open questions are recorded in [the entrance direction](context/projects/realm-entrance-direction.md). Its sample artifact/gesture sequence is a proposal. Stage count, content, failure rules and the teach-versus-filter relationship remain open. The current mechanics below describe the existing build and do not establish the revamp's approved design. LD remains in force.

### 3.2 3D presentation and viewpoint

- The experience must be **3D, viewed from a first-person perspective**. This requirement concerns the entrance/world, not merely the existing isolated fake-3D boss prototype.
- **Need for Madness is the visual reference.** Adam clarified that its **angular, low-poly visual style** is the main attraction. Free-roaming movement, vehicle mechanics and exact rendering techniques have not been selected by that reference.
- Preserve the investigation-led direction in section 3.1 through the 3D environment and its transitions. The renderer is a means of expressing the entrance; it does not decide its stage content or interaction rules.
- Exact camera movement, desktop/phone controls, geometry/material treatment, scene size, lighting and performance budgets remain to be designed and tested.

**Founder requirement and clarification, not implementation or approval to begin a renderer migration.** The older pure-canvas/no-library decision described a previous boss task; it does not constitute the approved technical plan for this whole-world revamp.

### 3.3 Technology recommendation — proposed

Provisional recommendation: **Three.js + Blender + Vite**, using one browser 3D engine/library. Three.js supplies rendering and add-ons; movement rules, collision handling, artifact interaction and stage management still need implementation. Blender supplies the model-authoring workflow; Vite supplies the development server and production build. These tools are recommended roles, not installed dependencies or a finalized architecture.

Desktop first-person look can use Three.js `PointerLockControls`; phone interaction needs a separately designed touch path. Add a physics engine such as Rapier only if physical object behavior or character-controller needs justify it. Babylon.js is an alternative with documented first-person cameras and camera collisions; PlayCanvas is an alternative with a visual browser editor. See [the researched options](context/projects/realm-3d-options.md) for sources, tradeoffs and verification limits.

### 3.4 Futures

- **At the end of the game, users receive a weird item that will be utilised in the brand's marketing collateral.**
- This is a founder-requested future concept. The item's identity, digital/physical form, delivery, persistence and specific use in collateral remain undefined. Its relationship to the current QR completion/access flow also remains open.
- Recording this concept does not make its production or marketing integration part of the initial 3D build scope.

### 3.5 Proposed first validation and open choices

Before expanding the world, review a small 3D encounter: one space, one investigable artifact, one meaningful response, and a visibly connected transition into another internal stage. Confirm the angular visual direction, first-person feel, discoverability, collision/input behavior and performance on named target devices. **Proposed validation scope; implementation not yet authorized.**

Decide the movement model and target devices before locking the engine/control plan. The item and its marketing use, stage count, narrative, failure/recovery and the teach-versus-filter relationship remain open. None of the earlier B20–B26/crobe approvals is inferred to authorize this revamp.

## 4. Current game journey

Source inspection on 2026-10-18, reconciled against `main` and the latest handover. No browser or deployed-build playtest was performed for this document.

| Stage | Current source behavior | Experience intent |
| --- | --- | --- |
| Entry | A welcome screen starts the game. A persisted local lockout can present a countdown and tracing-puzzle bypass. | Discovery and entry into the world. |
| Round I | Seven perception questions: four form-identification and three observation questions. Five correct answers pass; failure sets a local 24-hour lockout. | Attention and perception. |
| Round II | Invader waves, positioning and weapon choices, followed by the Conformarult boss. The four boss combinations are fokus lina, semic, machina, and plasma. | Readable combat, progression, and persistence. |
| Round III | A turn-based duel with strike, guard, and a health-gated void action. Gambler's Gambit is the recorded climax. | Decisions under pressure and a final confrontation. |
| Completion | Transition to a time-limited QR portal. | An earned opportunity to continue. |

The repository name and older descriptions refer to whack-a-mole. Current `js/rounds/round1.js` implements the perception gate. Round III's older timing-focused description is a design intention; the inspected implementation resolves action choices in turns. Local lockout storage is not proof of secure identity or access enforcement.

## 5. Requirements and acceptance evidence

These checks define proposed product acceptance evidence; they have not been passed by writing this document.

| ID | Requirement | Evidence needed |
| --- | --- | --- |
| R1 | A visitor can move through the intended entry, three rounds, and completion in order. | A complete browser playthrough with the intended build; observe failures, recovery, and transitions. |
| R2 | Round I applies the seven-question and five-correct rules consistently. | Exercise pass/fail, reload, lockout expiry, and puzzle bypass. Confirm the intended retry rules. |
| R3 | Round II weapons, enemy attacks, damage feedback, and upgrades are legible and usable. | Full Wave 1-to-boss playthroughs covering all four boss combinations and applicable input/cooldown paths. |
| R4 | Round III resolves actions and its climax consistently. | Exercise allowed/locked actions, win/fail paths, one-time Gambler's Gambit behavior, cleanup, and portal transition. |
| R5 | Players can discover the experience with sparse interface copy. | Observe players using the intended controls and reading key state changes; distinguish intentional mystery from input or visual defects. |
| R6 | The intended phone and desktop paths are usable. | Name the target devices/browsers, then check touch, keyboard/mouse, layout, audio controls, and frame stability. |
| R7 | The portal provides the intended completion opportunity. | Confirm QR destination and usability, expiry, repeat-use behavior, and phone-to-phone versus desktop-to-phone use against approved rules. |
| R8 | The game communicates the brand's world coherently. | Founder review of copy, silhouette, motion, sound, and narrative meaning against the approved brand direction. Player affinity remains unproven without suitable evidence. |

## 6. Implemented versus planned

| Area | Evidence/status | Remaining gate or work |
| --- | --- | --- |
| Round I | Perception gate exists in source. Older `PROJECT.md`/`DESIGN.md` describe the former mole/combo mechanics. | Reconcile obsolete descriptions; browser pass/fail and usability proof still needed. |
| Round II | Wave, boss, and four combination paths exist in source. | Joint playtest of the four combinations; Round II feature lock remains pending in the handover. |
| Wave echoes and HP scaling | `round2.js` creates two travelling-wave echo videos and scales boss HP from a base of 313 by 1.5 per counted upgrade. | Existence in source does not establish visual synchronization or balanced difficulty; playtest still needed. |
| Round III | Turn-based action system exists in source; older status notes call the round complete/locked. | Verify actual end-to-end behavior before relying on that completion claim. |
| Boss renderer | `js/rounds/boss3d.js` exists; the game does not import it. | Gate 1: Adam approves the 3D look before wiring it in. |
| Crobe look | Offline cowl-and-robe v1 prototype/contact sheet exists under `context/prototypes/crobe/`. | v2 planned: taller/narrower form, tapered sleeves, hem facets, sharper cowl. Not integrated. |
| Pincer Press polish | Hand-return/reattachment and timing polish remain pending in the handover. | Scope, implement only after authorization, then verify animation and combat interaction. |
| Boss SFX and sound pass | Recorded as waiting on the separate audio AI. | Delivered specifications, authorized wiring, and listening/playtest evidence. |
| Wave VFX sync | Playback synchronization remains pending in the handover. | Confirm visual/gameplay timing with the intended build. |
| Upgrade buttons | Styling remains pending and direction is unresolved. | Founder direction before implementation. |
| Gate 2 and B20-B26 | Full details were never recorded. | Reconstruct an explicit batch plan from the handover and Adam's decisions before shipping; do not invent the missing gate. |
| Global polish | Historically deferred until Round II feature lock. | Confirm that gate before prioritizing a broader polish sprint. |

Pending status is sourced from `HANDOVER.md`; this is not an exhaustive code audit proving that every pending item is absent.

## 7. Design, architecture, and storage constraints

- Preserve the existing vanilla HTML/CSS/JavaScript architecture, event flow, and game balance outside an approved task. Follow [agent.md](agent.md).
- Use negative space, minimal HUD, silhouette before color, and restrained feedback. Brand copy is lowercase, collective "we", cryptic, and free of selling language.
- Retain the discovery principle: no tutorials or explanatory brand copy. Raise concrete usability failures without silently changing that principle.
- Preserve settled commercial red lines in brand work: no discounts/sales and no paid advertising; guerrilla placement is allowed. Adam's latest summary also says "no public ads"; any additional restriction beyond paid advertising remains unclear. Small cluster drops are the recorded format. Influencer/celebrity seeding and open restocks remain open.
- Respect round/file ownership, audio boundaries, and visual approval gates. A plan, prototype, or documentation update does not authorize game implementation.
- Keep imported operations and garment R&D outside GitHub, regardless of repository visibility. Never save credentials in project documents.

## 8. Decisions still needed

1. **Teach versus filter:** confirm the intended relationship and what observation would show the game serving it.
2. **Release evidence:** name target devices/browsers and the acceptance bar for Round II feature lock and final completion.
3. **Gate 1:** review the next crobe visual before any renderer swap.
4. **Missing plan:** define Gate 2 and reconstruct B20-B26 from recorded dependencies and founder choices.
5. **Upgrade buttons:** choose the visual direction when that task is active.
6. **Brand policy:** propose a position on influencer/celebrity seeding and open restocks. Community removal rules are deliberately deferred.
7. **Access flow:** resolve the private supplement's operational questions privately; this repository does not establish them as verified behavior.

Do not reopen the question of what makes a drop "ready"; Adam previously declined it. Do not ask for the withheld name or private naming inspirations.

## 9. Maintenance and evidence

Use [SKILL.md](SKILL.md) for collaboration, modes, and save rules; `context/BRAND.md` for detailed identity; and `HANDOVER.md` for recent work and proof. Record decisions as decisions and recommendations as proposals. Keep planned, implemented, playtested, and released states distinct. Update the matching context summary after meaningful changes without rewriting another assistant's entries.
