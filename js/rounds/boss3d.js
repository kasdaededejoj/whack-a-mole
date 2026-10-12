// ── BOSS3D — fake-3D math module for the Conformarult boss ──
// Pure canvas 2D. No WebGL, no library. A handful of shaded boxes,
// rotated and projected with a simple perspective camera, re-sorted
// every frame by depth (painter's algorithm).
//
// This file is intentionally self-contained and stateless: every
// function takes plain numbers/objects in and returns plain
// numbers/objects out. round2.js owns all boss state (pose, timers,
// animation) and calls into here only to turn that state into
// screen-space shaded polygons.

// ── Camera ──
// Fixed orthographic-ish perspective: boss sits at distance CAM_DIST
// in front of the camera, FOV controls how much perspective "pop"
// rotation gives. Small FOV = flatter / more orthographic (closer to
// the old flat look); larger FOV = more dramatic depth.
const CAM_DIST = 520;
const FOV = 520; // FOV === CAM_DIST so scale=1 at z=0 — rest pose (no rotation)
                  // projects at exactly 1:1 pixel size, matching the old flat draw

// ── Rotation ──
// Rotate a point (x,y,z) around the Y axis (left-right turn) by `rad`.
function rotateY(x, y, z, rad) {
  const c = Math.cos(rad), s = Math.sin(rad);
  return { x: x * c + z * s, y, z: -x * s + z * c };
}

// Rotate a point around the X axis (nod/tilt) by `rad`.
function rotateX(x, y, z, rad) {
  const c = Math.cos(rad), s = Math.sin(rad);
  return { x, y: y * c - z * s, z: y * s + z * c };
}

// Rotate a point around the Z axis (roll) by `rad`.
function rotateZ(x, y, z, rad) {
  const c = Math.cos(rad), s = Math.sin(rad);
  return { x: x * c - y * s, y: x * s + y * c, z };
}

// Apply yaw (Y) then pitch (X) then roll (Z), in that order.
function rotatePoint(p, yaw = 0, pitch = 0, roll = 0) {
  let r = rotateY(p.x, p.y, p.z, yaw);
  r = rotateX(r.x, r.y, r.z, pitch);
  r = rotateZ(r.x, r.y, r.z, roll);
  return r;
}

// Project a 3D point (already rotated, object-space with z depth) to
// 2D screen offset from the object's anchor, plus the depth value
// used for sorting. originX/originY is the object's 2D anchor
// (where z=0 lands on screen).
function project(p, originX = 0, originY = 0) {
  const z = CAM_DIST + p.z;
  const scale = FOV / Math.max(1, z);
  return {
    x: originX + p.x * scale,
    y: originY + p.y * scale,
    depth: p.z,   // larger = closer to camera (toward viewer)
    scale
  };
}

// Build the 8 corner vertices of an axis-aligned box centred at
// (cx,cy,cz) with full width/height/depth w/h/d, in object space
// (z+ is toward the camera / "out of the screen").
function makeBoxVerts(cx, cy, cz, w, h, d) {
  const hw = w / 2, hh = h / 2, hd = d / 2;
  return [
    { x: cx - hw, y: cy - hh, z: cz - hd }, // 0 top-left-back
    { x: cx + hw, y: cy - hh, z: cz - hd }, // 1 top-right-back
    { x: cx + hw, y: cy + hh, z: cz - hd }, // 2 bot-right-back
    { x: cx - hw, y: cy + hh, z: cz - hd }, // 3 bot-left-back
    { x: cx - hw, y: cy - hh, z: cz + hd }, // 4 top-left-front
    { x: cx + hw, y: cy - hh, z: cz + hd }, // 5 top-right-front
    { x: cx + hw, y: cy + hh, z: cz + hd }, // 6 bot-right-front
    { x: cx - hw, y: cy + hh, z: cz + hd }, // 7 bot-left-front
  ];
}

// The 6 faces of a box as vertex-index quads, each with its object-
// space outward normal (unit vectors, axis-aligned since boxes are
// unrotated in object space — rotation is applied per-vertex later).
const BOX_FACES = [
  { name: 'front',  idx: [4, 5, 6, 7], normal: { x: 0, y: 0, z: 1 } },
  { name: 'back',   idx: [1, 0, 3, 2], normal: { x: 0, y: 0, z: -1 } },
  { name: 'right',  idx: [5, 1, 2, 6], normal: { x: 1, y: 0, z: 0 } },
  { name: 'left',   idx: [0, 4, 7, 3], normal: { x: -1, y: 0, z: 0 } },
  { name: 'top',    idx: [0, 1, 5, 4], normal: { x: 0, y: -1, z: 0 } },
  { name: 'bottom', idx: [7, 6, 2, 3], normal: { x: 0, y: 1, z: 0 } },
];

// Build a full box descriptor: rotated verts (object space, still
// centred on the box's own local origin) + face list with rotated
// normals. `yaw/pitch/roll` are the BOX's own rotation (for limbs
// that twist independently of the whole-body rotation); pass 0s for
// boxes that only inherit the body rotation applied later in
// projectBox.
function makeBox(cx, cy, cz, w, h, d, yaw = 0, pitch = 0, roll = 0) {
  const localVerts = makeBoxVerts(0, 0, 0, w, h, d).map(v => rotatePoint(v, yaw, pitch, roll));
  const faces = BOX_FACES.map(f => ({
    name: f.name,
    idx: f.idx,
    normal: rotatePoint(f.normal, yaw, pitch, roll),
  }));
  return { cx, cy, cz, verts: localVerts, faces };
}

// Light direction used for flat shading (greyscale only — no colour
// tint, keeps the stealth-industrial palette). Points from the
// surface toward the key light; normalise once up front.
const LIGHT_DIR = (() => {
  const x = -0.35, y = -0.6, z = 0.7;
  const len = Math.hypot(x, y, z);
  return { x: x / len, y: y / len, z: z / len };
})();
const AMBIENT = 0.55;   // floor brightness so unlit faces aren't pure black
const DIFFUSE = 0.45;   // how much the light direction can add on top

// Greyscale shade for a face given its rotated normal, scaled against
// a base [r,g,b] (segment colour). Returns an "rgb(r,g,b)" string.
function shadeFace(normal, baseColor) {
  const dot = normal.x * LIGHT_DIR.x + normal.y * LIGHT_DIR.y + normal.z * LIGHT_DIR.z;
  const lit = AMBIENT + DIFFUSE * Math.max(0, dot);
  const r = Math.min(255, Math.round(baseColor[0] * lit));
  const g = Math.min(255, Math.round(baseColor[1] * lit));
  const b = Math.min(255, Math.round(baseColor[2] * lit));
  return `rgb(${r},${g},${b})`;
}

// Take a box (from makeBox), apply the whole-body yaw/pitch/roll on
// top of its own local rotation + its object-space centre offset,
// then project every face to screen space. Returns an array of
// renderable faces: { name, points:[{x,y}×4], depth, normal,
// visible }. `visible` is a simple backface-cull vs the camera
// (camera looks down -z at the object from +CAM_DIST, so a face
// faces the camera if its rotated normal.z > 0 after body rotation —
// combined with per-vertex projection this gives correct hidden-face
// removal for convex boxes).
function projectBox(box, bodyYaw, bodyPitch, bodyRoll, originX, originY, baseColor) {
  // Rotate every vertex by the body transform, offset by box centre,
  // rotated by the body transform too (so limbs swing with the body).
  const centreRot = rotatePoint({ x: box.cx, y: box.cy, z: box.cz }, bodyYaw, bodyPitch, bodyRoll);
  const worldVerts = box.verts.map(v => {
    const rv = rotatePoint(v, bodyYaw, bodyPitch, bodyRoll);
    return { x: rv.x + centreRot.x, y: rv.y + centreRot.y, z: rv.z + centreRot.z };
  });
  const screenVerts = worldVerts.map(v => project(v, originX, originY));

  const faces = box.faces.map(f => {
    const rotNormal = rotatePoint(f.normal, bodyYaw, bodyPitch, bodyRoll);
    const visible = rotNormal.z > 0.001; // camera-facing
    const pts = f.idx.map(i => screenVerts[i]);
    const avgDepth = pts.reduce((s, p) => s + p.depth, 0) / pts.length;
    return {
      name: f.name,
      points: pts.map(p => ({ x: p.x, y: p.y })),
      depth: avgDepth,
      visible,
      fill: shadeFace(rotNormal, baseColor),
    };
  });

  return faces;
}

// Convenience: project a whole array of boxes (each { box, color })
// against one body transform, flatten to a single depth-sorted list
// of visible faces ready to fillPath + fill in back-to-front order.
function projectScene(parts, bodyYaw, bodyPitch, bodyRoll, originX, originY) {
  let allFaces = [];
  for (const part of parts) {
    const faces = projectBox(part.box, bodyYaw, bodyPitch, bodyRoll, originX, originY, part.color)
      .filter(f => f.visible);
    allFaces = allFaces.concat(faces);
  }
  // Painter's algorithm: far (small depth / more negative z) first,
  // near (large depth) last, so closer faces draw on top.
  allFaces.sort((a, b) => a.depth - b.depth);
  return allFaces;
}

// Draw a depth-sorted face list to a 2D canvas context. Each face is
// a filled quad; seam/outline drawing is left to the caller (round2
// draws its own flat seam slabs on top, same as the current flat
// boss, so the segmented look is preserved regardless of rotation).
function drawFaces(ctx, faces) {
  for (const f of faces) {
    const p = f.points;
    ctx.beginPath();
    ctx.moveTo(p[0].x, p[0].y);
    ctx.lineTo(p[1].x, p[1].y);
    ctx.lineTo(p[2].x, p[2].y);
    ctx.lineTo(p[3].x, p[3].y);
    ctx.closePath();
    ctx.fillStyle = f.fill;
    ctx.fill();
  }
}

// ── Conformarult body, built from boxes ──
// Mirrors the proportions of the flat v3 draw in round2.js exactly
// (same S scalar, same hw/hh/tw/th/xhw/xhh/lw/lh/lg), so the rest
// pose (no yaw/pitch/roll) projects to the same silhouette the flat
// version drew. Depth (d) per segment is a judgement call — thin
// enough to read as "slab", thick enough to show a visible side face
// on a turn. `handMorph` 0..1 blends hand box width toward a thin
// spike-like sliver (true spike geometry is drawn by the caller for
// the sharp triangle tip; this box stays a visual anchor/base).
//
// Returns { parts, dims } — parts: [{box, color, key}], dims: the
// same measurements the 2D draw uses, so callers can position seams
// and hitboxes identically to before.
function buildConformarultParts(S, opts = {}) {
  const SEAM = 3;
  const hw = 42 * S, hh = 15 * S;
  const tw = 28 * S, th = 34 * S;
  const xhw = 14 * S, xhh = 9 * S;
  const lw = 12 * S, lh = 16 * S, lg = 3 * S;
  const totalH = hh + SEAM + th + SEAM + lh;
  const bodyTop = -totalH / 2;

  const headTop = bodyTop;
  const torsoTop = headTop + hh + SEAM;
  const legTop = torsoTop + th + SEAM;
  const handY = torsoTop + 22 * S;

  const dims = { SEAM, hw, hh, tw, th, xhw, xhh, lw, lh, lg, totalH, bodyTop, headTop, torsoTop, legTop, handY };

  const COL_HEAD = [215, 215, 218];
  const COL_TORSO = [165, 165, 170];
  const COL_HAND = [190, 190, 195];
  const COL_LEG = [140, 140, 145];

  // Depth: roughly proportional to each segment's footprint so the
  // box reads as a slab, not a paper-thin card, once rotated.
  const headD = hw * 0.45;
  const torsoD = tw * 0.55;
  const handD = xhw * 0.65;
  const legD = lw * 0.7;

  const parts = [
    {
      key: 'head',
      box: makeBox(0, headTop + hh / 2, 0, hw, hh, headD),
      color: COL_HEAD,
    },
    {
      key: 'torso',
      box: makeBox(0, torsoTop + th / 2, 0, tw, th, torsoD),
      color: COL_TORSO,
    },
    {
      key: 'handL',
      box: makeBox(-(tw / 2 + xhw / 2 + 2), handY + xhh / 2, 0, xhw, xhh, handD),
      color: COL_HAND,
    },
    {
      key: 'handR',
      box: makeBox(tw / 2 + xhw / 2 + 2, handY + xhh / 2, 0, xhw, xhh, handD),
      color: COL_HAND,
    },
    {
      key: 'legL',
      box: makeBox(-(lg / 2 + lw / 2), legTop + lh / 2, 0, lw, lh, legD),
      color: COL_LEG,
    },
    {
      key: 'legR',
      box: makeBox(lg / 2 + lw / 2, legTop + lh / 2, 0, lw, lh, legD),
      color: COL_LEG,
    },
  ];

  return { parts, dims };
}

export {
  CAM_DIST, FOV,
  rotateY, rotateX, rotateZ, rotatePoint,
  project, makeBox, makeBoxVerts, BOX_FACES,
  shadeFace, projectBox, projectScene, drawFaces,
  buildConformarultParts,
};
