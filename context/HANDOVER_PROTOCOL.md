# Handover protocol

## When Adam says "save"
Update the project's `HANDOVER.md` on GitHub with: what changed, decisions made (including ones made in LD mode),
open questions, and what is still pending. Commit it on its own and report the commit hash.

## Starting a new chat on a project
1. Read `README.md`, then the project file in `projects/`, then that project's `HANDOVER.md`.
2. **Check whether every LD-mode decision in the handover has actually been implemented.** Compare the list against the code and
   `git log`, and report each as "done (commit)", "partly" or "not done". Do not assume done because it is written down.
3. Do not ship LD items until Adam exits LD mode.

## Hygiene
- Never write tokens, passwords or keys into any file or commit (GitHub push protection will block them, and they would be public).
- Do not touch another agent's scope. For the game: Round 2 agent edits only `js/rounds/round2.js` and `js/audio.js`.
- On rebase conflicts in `js/rounds/round2.js` or `HANDOVER.md`, take `--ours`.

## Two AIs sharing one repo (Claude and ChatGPT, used in parallel)
- Pull before you start and before you edit `HANDOVER.md` or anything in `context/`.
- One logical change per commit. Say who wrote it: start the commit message or the handover entry with `[Claude]` or `[ChatGPT]`.
- Add new dated entries at the top of `HANDOVER.md`; never rewrite or delete the other AI's entries. Correct them by adding a new entry.
- If only one AI has push access in a session, it drafts the update and Adam commits it.
- On a merge conflict in `HANDOVER.md` or `js/rounds/round2.js`, stop and show Adam both versions rather than choosing.
  (The older rule was "take `--ours`", which is only safe with one writer.)
- Never work on the same file at the same time: Adam says which AI owns which task.
