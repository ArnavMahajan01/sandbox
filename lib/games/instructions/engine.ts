export const engine = `# The 3D game engine

The sandbox is pre-seeded with a game engine under \`engine/\` next to
\`index.html\`. It is a set of ES modules you import directly — no build step, no
install. Prefer it for 3D games (and it works great for 2.5D/isometric too).
Reach for plain 2D \`<canvas>\` only when a game is genuinely flat and simple.

## Wiring it up

\`index.html\` already contains an import map for Three.js. Keep it whenever you
rewrite the file, or the engine (and any \`three\`/\`three/addons/\` imports) break:

\`\`\`html
<script type="importmap">
{
  "imports": {
    "three": "https://unpkg.com/three@0.169.0/build/three.module.js",
    "three/addons/": "https://unpkg.com/three@0.169.0/examples/jsm/"
  }
}
</script>
\`\`\`

Then write your game in a \`<script type="module">\` and import from the engine:

\`\`\`html
<div id="app"></div>
<script type="module">
  import { createGame, models, BRAND, Physics } from "./engine/index.js"

  const game = createGame({ background: BRAND.ink, cameraPosition: [0, 6, 12] })
  const ground = game.add(models.plane({ width: 50, height: 50, rotation: [-Math.PI/2, 0, 0] }))
  const player = game.add(models.capsule({ color: BRAND.orange, position: [0, 1, 0] }))

  game.onUpdate((dt) => {
    const move = game.input.axis2()
    player.position.x += move.x * dt * 6
    player.position.z -= move.y * dt * 6
  })
  game.start()
</script>
\`\`\`

## What's in the box (import from \`./engine/index.js\`)

- \`createGame(options)\` — fast path. Returns an \`Engine\` with \`.input\`, \`.hud\`,
  \`.lights\` wired up and tweens auto-updating. Opts: \`mount\`, \`background\`,
  \`cameraPosition\`, \`fov\`, \`lighting\`, and \`hud:false\`/\`input:false\` to opt out.
- \`Engine\` — the loop: \`add\`, \`remove\`, \`onUpdate((dt,elapsed)=>…)\`,
  \`onFixedUpdate\` (physics), \`start/stop/pause/resume\`, \`resize\`, \`dispose\`,
  \`screenshot\`. Handles DPR-capped resize and clamped delta time for you.
- Scene helpers: \`addLighting\`, \`addGround\`, \`addGrid\`, \`setGradientBackground\`,
  \`addFog\`, \`addFogExp\`, \`addStarfield\`.
- \`Input\` + \`VirtualJoystick\` — \`isDown/justPressed/justReleased\`, \`axis2()\`
  (WASD/arrows), mouse buttons, \`mouseDelta\`, pointer lock, touch. Bind actions
  with \`input.bind("jump", ["Space"])\`.
- Cameras: \`createOrbitControls\` (async), \`FirstPersonController\`,
  \`ThirdPersonCamera\`, \`TopDownCamera\`.
- \`models\` (namespace): \`box, sphere, cylinder, capsule, cone, plane, torus,
  character, textSprite, InstancedField, loadModel (GLTF/GLB), loadTexture\`.
- Animation: \`Easing\`, \`Tween\`, \`Timeline\`, \`Motion\` (bob/spin/pulse),
  \`ScreenShake\`, \`ModelAnimator\` (GLTF clips), \`walkCycle\`.
- \`Physics\`: \`Body\`, \`World\` (AABB collisions, gravity), \`CharacterController\`
  (jump with coyote time), \`pointerPick\`, \`raycast\`.
- FX: \`ParticleSystem\` (burst/emit), \`Trail\`, and \`postfx.addBloom(game)\`.
- HUD: \`HUD\` (\`addText\`, \`addBar\`, \`addCrosshair\`, \`toast\`) and \`Menu\`
  (start/pause/game-over screens with buttons).
- \`AudioEngine\` — procedural SFX with no asset files: \`audio.sfx("coin"|"jump"|
  "hit"|"explosion"|"powerup"|"laser"|"success")\`, \`audio.tone(...)\`,
  \`audio.music({ notes: [...] })\`. Call \`audio.resume()\` from a click first
  (browsers block audio until a user gesture).
- State: \`StateMachine\` (menu/playing/gameover), \`Store\` (reactive score/lives),
  \`Save\` (localStorage high scores), \`Timer\` (spawn cadences), \`Pool\`, \`Emitter\`.
- \`BRAND\` / \`BRAND_SEQUENCE\` — the product's logo palette (warm orange). Use it
  for a cohesive look.

## Guidelines

- Import only what you use; every module is tree-shake friendly and side-effect
  free (except when you call it).
- Register per-frame logic with \`game.onUpdate\`; put physics in
  \`game.onFixedUpdate\`. Never write your own \`requestAnimationFrame\` loop — the
  Engine owns the loop.
- You may extend or add files under \`engine/\` if a game needs a new primitive,
  but keep the public API stable so existing games keep working.
- You can still load any other library from a CDN if a game truly needs it, but
  reach for the engine first.`
