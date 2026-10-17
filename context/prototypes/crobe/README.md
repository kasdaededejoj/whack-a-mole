# Crobe (cowl + robe) boss prototype — NOT part of the game

Offline prototype for the 3D Conformarult boss look. It never touches the game. Status: **v1 rendered, v2 not built.**

- `render_crobe_v1.js` — Node + Playwright script. Reads `js/rounds/boss3d.js`, adds a prototype `makeLoft()` primitive
  and `crobeParts(S)` (cowl with open front + void + pale mask, three robe bands, sleeves, hands, legs), then renders a
  contact sheet: rest, turn 25, turn 55, turn -40 + nod, hit tilt, death split.
  Run: `NODE_PATH=$(npm root -g) node render_crobe_v1.js out.png` (edit the hardcoded path to `boss3d.js` at the top first).
- `crobe_v1_contact_sheet.png` — the v1 render.
- `plain_box_contact_sheet.png` — the plain-box body from `buildConformarultParts` (what exists in the engine today).

## v1 findings
Works structurally but is squat, sleeves are slabs that overlap the robe, hem has no pleats, cowl is too round.

## v2 fixes planned
1. Narrower shoulders and torso, longer hem (tall, not squat).
2. Tapered sleeves tucked to the body, hands at the cuffs.
3. Vertical pleat facets on the hem, merged into one skirt unit to avoid depth-sort flicker.
4. Cowl peak pushed forward.

## Before it goes into the game
Gate 1: Adam approves the look on a contact sheet. Then B23a wires `boss3d.js` in behind a flag with the flat boss as fallback.
`makeLoft` must move into `js/rounds/boss3d.js` (same `{cx,cy,cz,verts,faces}` shape as `makeBox`).
