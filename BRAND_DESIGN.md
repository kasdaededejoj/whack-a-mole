# ??? — living design guide

**Owner:** Adam. **Maintained by:** the vizar'dd with the relevant project agent. **Updated:** 2026-10-21.

This is the working design document for the brand's expression and its application to The Realm. It is a starting point for refinement, not a claim that the design is finished or implemented. Adam asked for a design Markdown that can be extended as the design and flow become clearer.

## 1. Document roles and decision status

- [Brand context](context/BRAND.md): detailed identity, ethos, voice, vocabulary, and source history.
- This guide: design language, its application, flow questions, and the design decision register.
- [PRD](PRD.md): product requirements, scope, current versus planned behavior, and acceptance evidence.
- [Legacy game design](DESIGN.md): earlier arcade-game principles/mechanics; not the specification for the new 3D entrance.
- [Applied brand brief](context/projects/realm-brand-basis.md): the reconciled ethos/aesthetic briefing that preceded world selection.

Use **recorded direction**, **proposal**, **open**, and **superseded** explicitly. A recorded design direction does not authorize implementation. Mark a proposal as a founder decision only after Adam chooses it, and retain the source of that choice. Specific colors, materials, settings, interactions, or technical tools are not approved by appearing as examples here.

## 2. Design purpose — recorded direction

??? is a founder-directed taste institution expressed through fashion, culture, community, and play. Its name remains withheld. Curiosity connects the outputs; the full archetype is **normality, mysticism, unconventionalism**.

Banality concerns ordinary life and interests held with personal conviction, including when others find them boring. The philosophical arc leads from freedom from irrelevant social authorities toward that conviction and deeper appreciation. The brand's stance is "we just are".

The intended touchpoint character is museum-like, archival, or editorial. This describes a quality of attention and presentation; it does not select a literal museum/archive setting. The precise design meaning of each archetype remains open for refinement. Teach-versus-filter must remain an explicit question when it affects infrastructure or an encounter's purpose.

## 3. Aesthetic language — recorded preferences

| Dimension | Recorded basis | Still to determine |
| --- | --- | --- |
| Palette | Black first; dark magenta-purple, dark reds/crimson, occasional midnight blue. | Exact values, contrast relationships, accent frequency, lighting, and material response. |
| Silhouette and proportion | Long, flowing, oversized forms; dye and wind-through movement in the fashion/design language. | Translation into spaces, objects, scale, and readable angular geometry. No environmental material palette is selected. |
| Composition | Restraint, negative space, silhouette, deliberate feedback, sparse interface. | Scene density, focal hierarchy, navigation cues, and how much each viewpoint reveals. |
| Motion | Slow, static, film-like moving images; presence and flow are references. | Camera movement, locomotion, object animation, transition duration, and motion/accessibility treatment in first-person play. |
| Typography | Lowercase, short wording, elegant and sparse presentation. | Type system for the new entrance. Existing BlackChancery/Thestral in the old build are implementation evidence, not a new typography decision. |
| Voice | Cryptic, mystical, collective "we", riddles; no hype or selling language. | The particular lines, placement, frequency, and relationship between text and environmental discovery. |
| Naming | Archaic/museum/Latin-esque naming, an internal apostrophe signature, Singaporean cultural influences; some spellings remain uncertain. | Important new names and final spellings. Do not infer a whole mythology from a sound-driven ability name. |
| Sound | Earlier game notes favor restrained, readable feedback. | New-world sound palette, spatial behavior, ambience, and silence. Existing audio ownership boundaries still apply. |
| References | Cyber sigilism, surrealism, Taoist presence/flow; bee-orchid mimicry is one extension. | Which reference meaningfully serves a particular design. No reference is a required decorative motif. |

Private garment R&D remains separate and is not copied into this guide.

## 4. The Realm — recorded entrance direction

The new direction is a shadowy entrance that invites investigation. Its visible presentation should form a connected experience; stage identifiers can remain internally for tracking.

- **First-person 3D** is recorded founder direction.
- **Angular, low-poly appearance** is the selected aspect of the Need for Madness reference. It does not select vehicles, movement freedom, or an engine.
- A **trace leading somewhere** and **artifacts concealing something** are primary. A **presence noticing the visitor** is secondary.
- Each stage needs a clear link to what came before and what follows. Merely hiding the word "round" does not define that link.
- Adam expressed interest in free exploration. The movement model, world scale, and degree of freedom remain open.
- A weird item received at the end and used in marketing collateral is a recorded future concept. Its identity, form, use, and integration remain open.
- The test-space entry is the existing **Shift+D panel**, with isolation from the main game. The engineering details remain in the PRD, not inferred from the aesthetic guide.

Source: [entrance direction](context/projects/realm-entrance-direction.md) and [PRD section 3](PRD.md#3-the-realm--3d-entrance-revamp). Existing mechanics and the earlier crobe task do not automatically define this new experience. LD remains in force.

## 5. Encounter and transition flow — proposed working template

Use this template to make an encounter reviewable before implementation. It is a design aid, not an approved encounter or fixed sequence of mechanics.

| Question | What to establish |
| --- | --- |
| Arrival | What does the visitor see, hear, or recognize on entering? |
| Invitation | Which concrete feature gives them a reason to investigate? |
| Action | What can they try, and how do the available controls make that possible? |
| Response | What perceptible, related consequence follows their action? |
| Discovery | What changes in their understanding of the object or place? |
| Link | What trace, object, recognition, or consequence connects this encounter to another? |
| Return | If revisiting is possible, what remains recognizable and what has changed? |
| Recovery | What happens after a missed clue, repeated action, interrupted session, or inability to use the intended input? |

**Recommendation:** make the invitation and consequence concrete while leaving the interpretation open. Intentional ambiguity about meaning and unclear controls are different design issues. Evaluate both without automatically adding a tutorial.

**Recommendation:** compare a few small scene compositions before committing to a whole setting. The earlier courtyard, archive objects, hidden passages, and self-repeating trace were illustrative proposals. They are not selected content.

## 6. Decisions to develop

| ID | Topic | Current status | Next useful design step |
| --- | --- | --- | --- |
| D01 | Brand archetype and curiosity | Recorded direction; individual terms need fuller design interpretation. | Describe how each operates in a candidate encounter without reducing it to a symbol. |
| D02 | First-person 3D and angular form | Recorded direction. | Review a small scene composition against the brand language before authorizing a build. |
| D03 | World/setting and environmental materials | Open. | Compare a small number of candidate settings with their rationale and tradeoffs. |
| D04 | Movement and exploration | Interest recorded; scope open. | Establish desired freedom, density, revisiting, and target inputs. |
| D05 | Encounter content and causal links | Investigative premise recorded; exact encounters open. | Fill the proposed flow template for one encounter and its transition. |
| D06 | Presence | Secondary role recorded; identity/behavior open. | Decide what its observation adds before giving it a literal form or hostility. |
| D07 | Typography, lighting, motion, sound | Preferences recorded; system open. | Review samples in context rather than approving isolated stylistic labels. |
| D08 | Completion item | Future concept recorded; details open. | Define its meaning and relation to the experience when that task is active. |
| D09 | Teach versus filter | Unresolved; filter-first/teach-inside is a provisional lean. | State what a proposed encounter asks of a visitor and what it helps them notice or learn. |

No new decision in this table is marked settled by creating the document. Founder choices should record date, original source, affected scope, and any superseded proposal; then update the PRD if a requirement changes.

## 7. Review questions — recommendations

- Does the choice express the full brand language, or rely on darkness and symbols alone?
- What makes this place/object worth attending to before the visitor knows the brand?
- Can a visitor connect their action to the next discovery without explanatory copy?
- Are ordinary and unconventional details given room to coexist?
- Does an introduced presence, object, or effect add a purpose that Adam has actually chosen?
- Is a supposed mystery a deliberate interpretation choice, an unresolved design decision, or an input/state defect?

Generic horror, cult/goth identity, hostile surveillance, occult lore, and jump scares are not selected simply by choosing a shadowy visual direction. These are unapproved directions, not a newly invented universal ban. Propose them explicitly if a future concept genuinely depends on them.

## 8. Maintenance

Extend this document as Adam supplies design detail. Keep founder decisions, interpretations, proposals, and unknowns distinct. Preserve source links and decision history; do not claim approval from agent consensus. Coordinate edits with you'xi when requirements or flow overlap. Save a concise handover/context update and leave gameplay implementation for an explicitly authorized task.
