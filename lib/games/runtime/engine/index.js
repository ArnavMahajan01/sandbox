/**
 * The game engine — a batteries-included toolkit for building 3D browser games
 * with Three.js. Import what you need from here (a single entry point), or grab
 * individual modules directly.
 *
 *   import { createGame, models, BRAND } from "./engine/index.js"
 *
 *   const game = createGame({ background: BRAND.ink })
 *   const cube = game.add(models.box({ color: BRAND.orange }))
 *   game.onUpdate((dt) => (cube.rotation.y += dt))
 *   game.start()
 *
 * Modules:
 *   core       Engine (loop, scene, camera, renderer, resize, dispose)
 *   scene      lighting rigs, ground, grid, sky gradient, fog, starfield
 *   input      Input (keyboard/mouse/touch/pointer-lock), VirtualJoystick
 *   controls   Orbit / FirstPerson / ThirdPerson / TopDown cameras
 *   models     primitives, character, textSprite, InstancedField, GLTF loaders
 *   animation  Easing, Tween, Timeline, Motion, ScreenShake, ModelAnimator
 *   physics    Body, World, CharacterController, raycasting
 *   particles  ParticleSystem, Trail
 *   hud        HUD (text/bars/toast/crosshair), Menu
 *   audio      AudioEngine (procedural SFX + music + samples)
 *   state      Emitter, StateMachine, Store, Save, Timer, Pool
 *   postfx     bloom + composer (loaded on demand)
 */
import * as THREE from "three"

import { Engine } from "./core.js"
import { Input } from "./input.js"
import { addLighting } from "./scene.js"
import { HUD } from "./hud.js"
import { Tween, Timeline } from "./animation.js"

export { THREE }
export { BRAND, BRAND_SEQUENCE, brandCss, brandAt } from "./brand.js"
export * from "./math.js"
export { Engine } from "./core.js"
export * from "./scene.js"
export { Input, VirtualJoystick } from "./input.js"
export * from "./controls.js"
export * as models from "./models.js"
export * from "./animation.js"
export { Physics, Body, World, CharacterController, pointerPick, raycast } from "./physics.js"
export { ParticleSystem, Trail } from "./particles.js"
export { HUD, Menu } from "./hud.js"
export { AudioEngine } from "./audio.js"
export * from "./state.js"
export * as postfx from "./postfx.js"

/**
 * createGame — the fast path. Spins up an Engine with lighting, an Input
 * manager, an HUD, and auto-updating tweens/timelines. Returns the engine with
 * `.input` and `.hud` attached. Everything is optional via `options`.
 *
 * Set `lighting:false`, `hud:false`, or `input:false` to opt out of any part.
 */
export function createGame(options = {}) {
  const engine = new Engine(options)

  if (options.input !== false) {
    engine.input = new Input(engine.canvas)
    engine.input.attach(engine)
  }

  if (options.lighting !== false) {
    engine.lights = addLighting(engine.scene, options.lighting ?? {})
  }

  if (options.hud !== false) {
    engine.hud = new HUD()
  }

  // Drive the animation helpers automatically so games "just work".
  engine.onUpdate((dt) => {
    Tween.updateAll(dt)
    Timeline.updateAll(dt)
  })

  return engine
}
