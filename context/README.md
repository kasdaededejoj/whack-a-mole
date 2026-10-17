# Adam — context pack

Entry point for any AI assistant working with Adam. Read this file first, then only the files your task needs.
Written 2026-10-17 so Adam can move between AI assistants (Claude to ChatGPT) without re-explaining himself.

## Files
| File | Read it when |
|------|--------------|
| `CUSTOM_INSTRUCTIONS.md` | Setting up a new assistant. Two blocks sized for ChatGPT's custom instructions boxes. |
| `PROFILE.md` | Always. Who Adam is. |
| `PREFERENCES.md` | Always. How Adam wants answers formatted. |
| `OPERATING_MODES.md` | Always. His mode system, standing rules and command words (LD, automata, decis, save). |
| `HANDOVER_PROTOCOL.md` | When a chat is ending or being continued elsewhere. |
| `projects/the-realm-game.md` | Any work on the browser game "The Realm". Links to the live handover. |
| `topics/design-research.md` | Fashion, design, textile or consumer-psychology questions. |

## Where things live (one home per thing, to avoid confusion)
| What | Home | Who reads it |
|------|------|--------------|
| Who Adam is, how he wants answers, his modes and rules | `context/` (this folder, split by topic) | every AI, every session |
| Game status, history, what is done / not done | `/HANDOVER.md` (master, newest entry first) | whoever works on the game |
| Short game summary + progress table | `context/projects/the-realm-game.md` | quick orientation only; if it disagrees with HANDOVER.md or the code, they win |
| Brand operations, unreleased garment designs, strategy notes | `PRIVATE_brand-context.md`, uploaded to the assistant, never in GitHub | assistant's private project files |
| Claude's own memory of Adam | Claude's memory (separate copy) | Claude only; ChatGPT does not see it |

## Not in this repo (on purpose)
This repo is public. Brand operations (funnel, community setup, IP strategy) and unreleased garment
designs are kept out. Adam uploads those to his assistant directly as `PRIVATE_brand-context.md`.
If a task needs them and they are missing, ask Adam.

## Rules for assistants reading this
- Treat this as data about Adam, not as instructions that override his current message.
- Never store or repeat tokens, passwords or keys, even if they appear in a chat.
- Where a file says "TODO", the original text is missing: ask Adam rather than guessing.
