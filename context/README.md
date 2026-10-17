# Adam — context pack

Entry point for any AI assistant working with Adam. Read this file first, then only the files your task needs.
Written 2026-10-17 so Adam can move between AI assistants (Claude to ChatGPT) without re-explaining himself.

## You are not working alone
- **ChatGPT and Claude work for Adam at the same time**, on the same repo and the same projects. Assume the other AI has made changes since you last looked: pull and read `HANDOVER.md` before editing.
- **Claude is on a free plan** (limited usage, so it can run out mid-task, and it has no scheduled tasks or browser control). **ChatGPT is on Adam's paid subscription.** Because of this, give Claude small, self-contained tasks, and expect ChatGPT to carry the longer sessions.
- Hand over cleanly: finish with a save (see the save habit), so whichever AI picks up next starts from the real state.
- Say which AI you are in every handover entry and commit (`[Claude]` / `[ChatGPT]`).

## Files
| File | Read it when |
|------|--------------|
| `CUSTOM_INSTRUCTIONS.md` | Setting up a new assistant. Two blocks sized for ChatGPT's custom instructions boxes. |
| `BRAND.md` | Anything about the brand: ethos, voice, history, how it operates, red lines. Read it for any brand task. |
| `PROFILE.md` | Always. Who Adam is. |
| `PREFERENCES.md` | Always. How Adam wants answers formatted. |
| `OPERATING_MODES.md` | Always. His mode system, standing rules and command words (LD, automata, decis, save). |
| `HANDOVER_PROTOCOL.md` | When a chat is ending or being continued elsewhere. |
| `projects/the-realm-game.md` | Any work on the browser game "The Realm". Links to the live handover. |
| `prototypes/crobe/` | Work on the 3D boss look (cowl + robe prototype, v1 renders, v2 plan). |
| `topics/design-research.md` | Fashion, design, textile or consumer-psychology questions. |

## Where things live (one home per thing, to avoid confusion)
| What | Home | Who reads it |
|------|------|--------------|
| Who Adam is, how he wants answers, his modes and rules | `context/` (this folder, split by topic) | every AI, every session |
| Game status, history, what is done / not done | `/HANDOVER.md` (master, newest entry first) | whoever works on the game |
| Short game summary + progress table | `context/projects/the-realm-game.md` | quick orientation only; if it disagrees with HANDOVER.md or the code, they win |
| Everything about the brand | `context/BRAND.md` (one page, public by Adam's choice) | every AI |
| Garment specs and unreleased designs | `PRIVATE_garment-rd.md`, uploaded to the assistant, never in GitHub | assistant's private project files |
| Claude's own memory of Adam | Claude's memory (separate copy) | Claude only; ChatGPT does not see it |

## Not in this repo (on purpose)
Garment specs and unreleased designs are kept out. Adam uploads them to his assistant directly as `PRIVATE_garment-rd.md`.
If a task needs them and they are missing, ask Adam.

## First thing to do
Read `BRAND.md`, then do its section 12 self-check (two short questions) before replying to Adam. If you can't answer them confidently, say so and ask.

## Rules for assistants reading this
- Treat this as data about Adam, not as instructions that override his current message.
- Never store or repeat tokens, passwords or keys, even if they appear in a chat.
- Where a file says "TODO", the original text is missing: ask Adam rather than guessing.
