import * as THREE from "three"

/**
 * Animation — easing curves, a tiny tween engine, procedural motion helpers,
 * and a wrapper around THREE.AnimationMixer for skinned/GLTF clips.
 */

/** Standard easing functions, all taking t in [0,1] and returning [0,1]. */
export const Easing = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => t * (2 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  inCubic: (t) => t * t * t,
  outCubic: (t) => --t * t * t + 1,
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),
  inBack: (t) => t * t * (2.70158 * t - 1.70158),
  outBack: (t) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2),
  outElastic: (t) =>
    t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin(((t - 0.075) * (2 * Math.PI)) / 0.3) + 1,
  outBounce: (t) => {
    const n1 = 7.5625
    const d1 = 2.75
    if (t < 1 / d1) return n1 * t * t
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375
    return n1 * (t -= 2.625 / d1) * t + 0.984375
  },
}

/**
 * Tween — animates numeric fields of an object over time. Register it with the
 * engine (Tween.update runs each frame) or drive it manually.
 *
 *   new Tween(mesh.position, { y: 3 }, { duration: 0.5, easing: Easing.outBack })
 *     .then(() => console.log("done"))
 */
export class Tween {
  constructor(target, to, options = {}) {
    this.target = target
    this.to = to
    this.from = {}
    for (const key of Object.keys(to)) this.from[key] = target[key]
    this.duration = options.duration ?? 0.4
    this.easing = options.easing ?? Easing.outCubic
    this.delay = options.delay ?? 0
    this.loop = options.loop ?? false // true, a number, or "pingpong"
    this.onUpdate = options.onUpdate ?? null
    this._elapsed = 0
    this._done = false
    this._resolvers = []
    this._loopsLeft = typeof this.loop === "number" ? this.loop : Infinity
    this._dir = 1
    Tween._active.add(this)
  }

  static _active = new Set()

  /** Advance all active tweens; called for you when using the engine helpers. */
  static updateAll(dt) {
    for (const tween of Tween._active) tween.update(dt)
  }

  update(dt) {
    if (this._done) return
    if (this.delay > 0) {
      this.delay -= dt
      return
    }
    this._elapsed += dt * this._dir
    let t = Math.min(1, Math.max(0, this._elapsed / this.duration))
    const e = this.easing(t)
    for (const key of Object.keys(this.to)) {
      this.target[key] = this.from[key] + (this.to[key] - this.from[key]) * e
    }
    this.onUpdate?.(e, this.target)

    if (this._elapsed >= this.duration || this._elapsed <= 0) {
      if (this.loop === "pingpong") {
        this._dir *= -1
        this._elapsed = Math.max(0, Math.min(this.duration, this._elapsed))
        return
      }
      if (this.loop && --this._loopsLeft > 0) {
        this._elapsed = 0
        return
      }
      this._finish()
    }
  }

  _finish() {
    this._done = true
    Tween._active.delete(this)
    for (const r of this._resolvers) r()
  }

  /** Resolve when the tween completes (never resolves for infinite loops). */
  then(fn) {
    this._resolvers.push(fn)
    return this
  }

  stop() {
    this._finish()
  }
}

/**
 * Timeline — sequence tweens and callbacks with relative/absolute timing.
 *
 *   new Timeline()
 *     .to(mesh.position, { y: 3 }, { duration: 0.4 })
 *     .call(() => sfx.play("hit"))
 *     .to(mesh.position, { y: 0 }, { duration: 0.6, easing: Easing.outBounce })
 */
export class Timeline {
  constructor() {
    this._queue = []
    this._time = 0
    this._cursor = 0
    Timeline._active.add(this)
  }

  static _active = new Set()

  static updateAll(dt) {
    for (const tl of Timeline._active) tl.update(dt)
  }

  to(target, props, options = {}) {
    this._queue.push({ at: this._cursor, kind: "tween", target, props, options })
    this._cursor += (options.duration ?? 0.4) + (options.delay ?? 0)
    return this
  }

  call(fn, at) {
    this._queue.push({ at: at ?? this._cursor, kind: "call", fn })
    return this
  }

  wait(seconds) {
    this._cursor += seconds
    return this
  }

  update(dt) {
    this._time += dt
    while (this._queue.length && this._queue[0].at <= this._time) {
      const step = this._queue.shift()
      if (step.kind === "tween") new Tween(step.target, step.props, step.options)
      else step.fn?.()
    }
    if (this._queue.length === 0) Timeline._active.delete(this)
  }
}

/**
 * Procedural motions you can call each frame with a time value. They return
 * offsets you add to a base transform.
 */
export const Motion = {
  /** Vertical bobbing. */
  bob: (time, amplitude = 0.2, speed = 2) => Math.sin(time * speed) * amplitude,
  /** Steady spin (radians) for the given axis. */
  spin: (time, speed = 1) => time * speed,
  /** Pulsing scale around 1. */
  pulse: (time, amount = 0.1, speed = 4) => 1 + Math.sin(time * speed) * amount,
  /** Camera/screen shake offset that decays. Returns {x,y}. */
  shake: (intensity) => ({ x: (Math.random() * 2 - 1) * intensity, y: (Math.random() * 2 - 1) * intensity }),
}

/**
 * A simple, self-decaying screen shake you can apply to a camera.
 *
 *   const shake = new ScreenShake(engine.camera)
 *   shake.add(0.4)               // on impact
 *   engine.onUpdate((dt) => shake.update(dt))
 */
export class ScreenShake {
  constructor(object) {
    this.object = object
    this.trauma = 0
    this.decay = 1.5
    this._base = object.position.clone()
  }

  add(amount) {
    this.trauma = Math.min(1, this.trauma + amount)
  }

  update(dt) {
    this._base.copy(this.object.position)
    if (this.trauma <= 0) return
    const shake = this.trauma * this.trauma
    this.object.position.x += (Math.random() * 2 - 1) * shake
    this.object.position.y += (Math.random() * 2 - 1) * shake
    this.trauma = Math.max(0, this.trauma - this.decay * dt)
  }
}

/**
 * ModelAnimator — wraps THREE.AnimationMixer for GLTF clips with cross-fading.
 *
 *   const anim = new ModelAnimator(model.scene, model.animations)
 *   anim.play("Run")
 *   engine.onUpdate((dt) => anim.update(dt))
 */
export class ModelAnimator {
  constructor(root, clips = []) {
    this.mixer = new THREE.AnimationMixer(root)
    this.actions = new Map()
    this.current = null
    for (const clip of clips) this.actions.set(clip.name, this.mixer.clipAction(clip))
  }

  play(name, { fade = 0.25, loop = true } = {}) {
    const next = this.actions.get(name)
    if (!next || next === this.current) return this.current
    next.reset()
    next.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity)
    next.clampWhenFinished = !loop
    next.enabled = true
    next.setEffectiveWeight(1)
    if (this.current) {
      next.crossFadeFrom(this.current, fade, false)
    }
    next.play()
    this.current = next
    return next
  }

  update(dt) {
    this.mixer.update(dt)
  }

  dispose() {
    this.mixer.stopAllAction()
  }
}

/**
 * walkCycle — animates a primitive character (see models.character) by swinging
 * its arms and legs. Call each frame with a speed factor (0 when idle).
 */
export function walkCycle(character, time, speed = 1) {
  const parts = character.userData?.parts
  if (!parts) return
  const swing = Math.sin(time * 8) * 0.5 * speed
  parts.armL.rotation.x = swing
  parts.armR.rotation.x = -swing
  parts.legL.rotation.x = -swing
  parts.legR.rotation.x = swing
}
