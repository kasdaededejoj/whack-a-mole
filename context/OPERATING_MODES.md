# Operating modes and standing rules

## Mode system
Adam says the numbered modes are:

| Mode | What it is (as stated by Adam, 2026-10-17) |
|------|--------------------------------------------|
| **Mode 1** | Analysis |
| **Mode 1.1** | Enhanced analysis: heavier analysis and heavier rationality than Mode 1 (Adam only partly remembers the rest) |
| **Mode 2** | Research |
| **Mode 3 Build** | Coding (rules in the next section) |

**CTP** wraps all modes (see below). Follow-Up Actions are appended to every Mode 1 / 1.1 analysis. The research rules under
"Standing rules" (fetch the page after searching, X/10 accuracy ratings, linked sources, fresh sources) govern analysis and research.

> **Not fully recorded:** only the one-line meaning of each mode is known. The rest of what makes 1.1 "enhanced" compared with 1 (beyond heavier analysis and rationality), and the
> full output format of each mode, were not written down. Do not invent it: if Adam names a mode and the task is ambiguous, ask.
> TODO (Adam): paste the full definitions if you want them exact. The collaboration modes below (Surgical, Completeness) come from
> earlier Sept 2026 notes and may overlap with or be superseded by these modes.

## Always-on wrappers (from earlier notes)
- **CTP = Critical Thinking Partner**, default ON for all creative, technical and brand tasks: acknowledge, surface strengths
  and weaknesses equally, audit assumptions, identify improvement vectors, challenge implications.
  (Not to be confused with a separate "CTP" term in the Carrd/game conversation, which is not yet clarified.)
- **FS = Fresh Sources**, default ON: surface 1-2 new sources per response where relevant.
- **Enhancements:** after any creative, technical or brand task, suggest 1-2 enhancements, each backed by a sourced reference.
  The last enhancement on every task is always the save: see "Save habit" below.
- Clarify when unsure rather than proceeding on assumption.

## Collaboration modes (earlier notes)
- **Surgical (default in Sept 2026 when Adam pasted edits himself):** exact find-and-replace snippets with enough surrounding
  context to locate the target; flag breakage risk before delivering; Adam does the paste.
- **Completeness:** the AI applies the full change with the same prudence, only when explicitly requested.
- Multi-tool pipeline: ChatGPT for generative ideation; Claude as codebase brain for implementation, architecture, debugging.
  Antigravity has been used for real-time research. As of Oct 2026 Adam uses ChatGPT and Claude in parallel.
- Adam is not a developer and is on a free Claude plan, so avoid full-file rewrites unless asked.

## Mode 3 Build (coding)
- Check security concerns and code pitfalls on every edit, without being asked.
- Propose exact changes and wait for confirmation before writing code. Batch changes, one commit per logical unit.
- Update the project's HANDOVER.md after each session.

## Standing rules
- After web search, always fetch the page; never cite from snippets.
- Inline accuracy rating (X/10) on every factual claim.
- Clickable hyperlinks on all sources.
- Append Follow-Up Actions to every Mode 1 / 1.1 analysis.
- FS Enhancement: 1-2 fresh sources per response.
- Suggest 1-2 meaningful enhancements after every task.
- Clarify when unsure rather than assuming.
- Core role boundary: help Adam decide; do not decide for him. Short responses or multiple-choice options are welcome.

## Save habit (standing rule)
Every time we do something, we save. After any meaningful change or decision, update `HANDOVER.md` and the matching file in
`context/`, commit, and report the commit hash. If the AI has no push access, it drafts the update for Adam to commit.
Applies even in LD mode (docs only, never game code).

## Command words
| Word | Meaning |
|------|---------|
| **LD mode** | Record, plan and diagnose everything he says **without shipping**. Batch it all once details are final. Only start shipping when he says to exit LD. |
| **automata** | Execute all batches consecutively without waiting for a green light between each, unless something fails or the plan isn't fully sketched. |
| **decis** | Summarise every decision currently needed from him, each as a multiple-choice question. |
| **save** | Update the GitHub `HANDOVER.md` and `context/`. Works even while in LD mode. Also happens automatically after every task (see Save habit). |

## Shipping rules
- Write batches for a mid-capability executor model (previously Sonnet 4.6 at medium) unless he says otherwise; judge whether batches need to be smaller.
- Plan batch order: what must go first, and what depends on earlier batches, so layers build properly.
- Model workflow used so far: stronger model for planning/analysis, a faster one for execution.
