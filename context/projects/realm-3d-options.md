# [ChatGPT] The Realm — browser 3D options

Researched 2026-10-21 at Adam's request. Product requirements live in PRD section 3. Source chat: you'xi, `01a158f1-2e90-7d63-af9b-804d5afda98c`. LD remains in force. No packages were installed, code migrated, assets built, accounts opened or gameplay deployed.

## Confirmed direction

Adam requires 3D from a first-person perspective. He cited Need for Madness and clarified that its **angular, low-poly visual style** matters primarily. The exact camera/movement model is still open. An end-of-game weird item, later used in marketing collateral, is recorded under **Futures** in PRD section 3.4; its form and integration are unspecified. **10/10 — direct founder statements.**

## Provisional recommendation

**Three.js + Blender + Vite. Confidence: 8/10 as a fit recommendation, not benchmarked or founder-approved.** This provides a code-based browser renderer and a model pipeline appropriate for authoring a deliberately spare world. Asset quality and the invitation to investigate still require design work; selecting a renderer does not establish them.

| Tool / part | Role | Boundary | Source-backed confidence |
| --- | --- | --- | --- |
| Three.js | Render the world, models, materials and lighting in a browser; its `WebGLRenderer` uses WebGL 2. | A rendering library, not a finished game framework. We must supply stage flow, input rules, interaction and collision behavior. | 9/10 — official library/renderer documentation. |
| Three.js `PointerLockControls` | Desktop first-person mouse look and movement helpers. | Not a complete character controller or collision system; not a substitute for phone controls. | 9/10 — documented API. |
| Blender with glTF export | Author angular models/environment assets and export a format that Three.js `GLTFLoader` loads. | Modelling/asset preparation is a separate activity from runtime rendering. Assets can also begin as code-built primitives for a scoped prototype. | 9/10 — official Khronos Blender exporter and Three.js loader. |
| Vite | Local development server and production builds for the JavaScript project. | Development tooling, not the 3D renderer and not an intrinsic requirement of WebGL. No framework migration has been selected. | 9/10 — official Vite guide. |
| Existing Web Audio / browser audio | Candidate foundation for environmental sound and artifact responses. | Existing code needs review for reuse; no listening or spatial-audio prototype was performed in this research. | 8/10 — proposal based on existing source, not new runtime proof. |
| Rapier — optional | Rigid-body physics/colliders and related physical behavior if the encounter needs it. | Do not add it by default just because the world is 3D. Simple static collision and scripted artifact movements may be enough for an initial encounter. | 9/10 for capabilities; 8/10 for the conditional recommendation. |

## Alternatives

- **Babylon.js:** a browser engine with a documented UniversalCamera for first-person movement and camera/mesh collision support. Prefer considering it if integrated engine systems reduce the custom game infrastructure we need. Its documented input options include keyboard, mouse, touch and gamepad, but suitability of the resulting controls still requires a device test. **9/10 — official documentation; relative implementation effort is an engineering judgment, not measured here.**
- **PlayCanvas:** a JavaScript engine with a visual browser editor, asset import, material editing, collaboration and device testing facilities. Consider it if Adam wants to arrange and tune scenes visually as part of the authoring workflow. Workspace/export workflow would need an explicit decision before adoption. **9/10 — official editor description; fit is untested.**

These are alternative engine/authoring approaches, not a list of engines to install together. No winner is established by benchmark. Three.js is the current recommendation because the stated experience is a custom browser entrance; Babylon.js and PlayCanvas remain credible choices if the scope or authoring preference points toward them.

## Proposed first technical check

One small space, one artifact that invites inspection, a related visible response, and one linked transition. This should resolve the initial camera/movement feel and controls on named desktop/phone targets while keeping the low-poly visual reference recognizable. Use elapsed-time simulation and intentional input/collision boundaries. Record loading, frame stability and perceived readability; low polygon counts alone do not establish performance. **8/10 — proposed validation scope, not approval to build it.**

## Primary sources inspected

These pages were opened, rather than relying on search snippets. Technical facts above are descriptions of available capabilities, not evidence of their implementation in The Realm.

- [Three.js](https://threejs.org/) and [WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html)
- [Three.js PointerLockControls](https://threejs.org/docs/pages/PointerLockControls.html)
- [Three.js GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html)
- [Khronos Blender glTF importer/exporter](https://github.com/KhronosGroup/glTF-Blender-IO)
- [Vite guide](https://vite.dev/guide/)
- [Rapier JavaScript guide](https://rapier.rs/docs/user_guides/javascript/getting_started_js/)
- [Babylon.js camera introduction](https://doc.babylonjs.com/features/featuresDeepDive/cameras/camera_introduction/) and [camera collisions](https://doc.babylonjs.com/features/featuresDeepDive/cameras/camera_collisions/)
- [PlayCanvas Editor](https://dev.playcanvas.com/products/editor)
- [Need for Madness official site](https://needformadness.com/) — establishes the cited work as a 3D car game; the specific desired visual qualities come from Adam's clarification, not an inferred camera specification.

Some initial Blender manual/feature-page fetches failed in the research tool. The accessible Khronos-maintained exporter repository supplied the asset-format evidence; no installed Blender version or local export was verified.
