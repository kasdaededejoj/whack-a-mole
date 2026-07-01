# THE REALM

---

# CURRENT CONTEXT

## Current Objective

Playtest Round II and prepare for **Feature Lock**.

Round II gameplay features are complete. Next step is verification, not new features.

---

## Current Sprint

None — Sprint 7 complete.

---

# PROJECT STATUS

## Round I

**Status:** ✅ Feature Complete

Implemented:

* Purparlity bonus target
* Purparlity preserves combo
* Combo degradation system
* 7.5× combo cap
* Magenta flash
* No Purparlity hit text
* Purparlity SVG rendering path verified

UI polish has been implemented but has **not yet been playtested**.

---

## Round II

**Status:** 🟡 Feature Complete — pending playtest

Implemented:

* Wave 5 (bridge wave before boss)
* Boss at Wave 6
* Dedicated missile renderer with refined silhouette
* Wave 3 lane-clearing missiles
* Wave 4 upgrades (nuka, machina)
* Projectile progression (bullet → missile → nuka)
* Keyboard-key Nuka prompt
* Nuka cooldown progress bar
* Nuka re-activation via Space
* Boss rebalance

---

## Round III

**Status:** ✅ Feature Complete

Implemented:

* Gambler's Gambit
* CRT distortion
* White flash
* Magenta particles
* One-time trigger

No planned feature work.

---

# PLAYTEST STATUS

The latest implementation has had some verification, but a full playtest of Round II is pending.

Pending verification:

* Round II full run (Wave 1 → Boss)
* Nuka skill check + cooldown bar
* Projectile readability under heavy combat
* Round I HUD polish

✅ Regressions Resolved:

* Homepage "Begin" button — Restored missing `startDuel` and `stopDuel` exports in `round3.js` that caused a fatal module loading error.
* Purparlity SVG in Round I — Refactored asset loading to clone the inline SVG from the homepage, resolving local MIME-type rendering issues.

Do not assume these changes are completely final until fully verified through playtesting.

---

# FEATURE LOCK

Round I — ✅ Locked after verification.

Round II — ❌ Not yet locked.

Round III — ✅ Locked.

---

# NEXT MILESTONE

Playtest Round II.

Fix bugs.

Feature Lock Round II.

Only then begin the global polish sprint.

---

# FUTURE POLISH (Deferred)

* Homepage polish review
* Global typography audit
* Upgrade screen polish
* HUD micro-interactions
* UI animation consistency
* Performance optimisation

Do not prioritise these until Round II is feature locked.

---

# DESIGN PHILOSOPHY

Gameplay first. Minimal UI. 90% negative space. Identity through silhouette before colour. Motion over visual noise. Refinement over complexity.

---

## Build Version

Current Version:
v0.8.0

Repository Branch:
main

Last Completed Sprint:
Sprint 7

Current Sprint:
—

Feature Lock:
Round I ✅
Round II ❌
Round III ✅

Release Candidate:
No
