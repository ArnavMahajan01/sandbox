import * as THREE from "three"

import { BRAND } from "./brand.js"

/**
 * Engine — the spine of a 3D game.
 *
 * Wraps a THREE.Scene, camera, and WebGLRenderer, owns the animation loop, and
 * exposes a tiny update/render subscription API. It handles the boring-but-vital
 * details: DPR-capped resizing, a clamped delta time, an optional fixed-timestep
 * accumulator for physics, pause/resume, tab-visibility handling, and disposal.
 *
 *   import { Engine } from "./engine/index.js"
 *
 *   const game = new Engine({ background: 0x0b0b0f })
 *   const cube = game.add(new THREE.Mesh(box, mat))
 *   game.onUpdate((dt) => { cube.rotation.y += dt })
 *   game.start()
 */
export class Engine {
  constructor(options = {}) {
    const {
      mount = document.body,
      background = BRAND.ink,
      antialias = true,
      alpha = false,
      pixelRatioCap = 2,
      shadows = true,
      fov = 60,
      near = 0.1,
      far = 2000,
      cameraPosition = [0, 4, 10],
      cameraTarget = [0, 0, 0],
      fixedStep = 1 / 60,
    } = options

    this.mount = typeof mount === "string" ? document.querySelector(mount) : mount
    this.fixedStep = fixedStep
    this._accumulator = 0
    this._running = false
    this._paused = false
    this._updaters = new Set()
    this._fixedUpdaters = new Set()
    this._renderers = new Set()
    this._resizers = new Set()
    this._disposables = new Set()

    this.scene = new THREE.Scene()
    if (background !== null && background !== "transparent") {
      this.scene.background = new THREE.Color(background)
    }

    this.camera = new THREE.PerspectiveCamera(fov, this._aspect(), near, far)
    this.camera.position.set(...cameraPosition)
    this.camera.lookAt(new THREE.Vector3(...cameraTarget))

    this.renderer = new THREE.WebGLRenderer({
      antialias,
      alpha,
      powerPreference: "high-performance",
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatioCap))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.0
    if (shadows) {
      this.renderer.shadowMap.enabled = true
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    }

    this.canvas = this.renderer.domElement
    this.canvas.style.display = "block"
    this.canvas.style.touchAction = "none"
    this.mount.appendChild(this.canvas)

    this.clock = new THREE.Clock()
    this.time = 0
    this.frame = 0

    // Optional post-processing composer, populated by postfx helpers.
    this.composer = null

    this._onResize = () => this.resize()
    this._onVisibility = () => {
      if (document.hidden) this.clock.stop()
      else this.clock.start()
    }
    window.addEventListener("resize", this._onResize)
    document.addEventListener("visibilitychange", this._onVisibility)

    this.resize()
  }

  _aspect() {
    const el = this.mount === document.body ? window : this.mount
    const w = el === window ? window.innerWidth : this.mount.clientWidth
    const h = el === window ? window.innerHeight : this.mount.clientHeight
    return w / Math.max(1, h)
  }

  _size() {
    if (this.mount === document.body) {
      return { width: window.innerWidth, height: window.innerHeight }
    }
    return { width: this.mount.clientWidth, height: this.mount.clientHeight }
  }

  /** Add an object to the scene and return it (so you can inline-assign). */
  add(object) {
    this.scene.add(object)
    return object
  }

  remove(object) {
    this.scene.remove(object)
    return object
  }

  /** Register a per-frame callback: (dt, elapsed, engine) => void. Returns an unsubscribe fn. */
  onUpdate(fn) {
    this._updaters.add(fn)
    return () => this._updaters.delete(fn)
  }

  /** Register a fixed-timestep callback, ideal for physics. (step, engine) => void. */
  onFixedUpdate(fn) {
    this._fixedUpdaters.add(fn)
    return () => this._fixedUpdaters.delete(fn)
  }

  /** Register a callback that runs right before rendering. (dt, engine) => void. */
  onRender(fn) {
    this._renderers.add(fn)
    return () => this._renderers.delete(fn)
  }

  /** Register a callback that runs on resize. (width, height, engine) => void. */
  onResize(fn) {
    this._resizers.add(fn)
    return () => this._resizers.delete(fn)
  }

  /** Track anything with a .dispose() so it's cleaned up with the engine. */
  track(disposable) {
    this._disposables.add(disposable)
    return disposable
  }

  start() {
    if (this._running) return this
    this._running = true
    this._paused = false
    this.clock.start()
    const loop = () => {
      if (!this._running) return
      this._raf = requestAnimationFrame(loop)
      this._tick()
    }
    this._raf = requestAnimationFrame(loop)
    return this
  }

  stop() {
    this._running = false
    if (this._raf) cancelAnimationFrame(this._raf)
    return this
  }

  pause() {
    this._paused = true
    return this
  }

  resume() {
    this._paused = false
    return this
  }

  get paused() {
    return this._paused
  }

  _tick() {
    // Clamp dt so a long stall (tab switch, breakpoint) can't teleport things.
    const dt = Math.min(this.clock.getDelta(), 0.1)
    if (this._paused) {
      this._render(0)
      return
    }
    this.time += dt
    this.frame++

    this._accumulator += dt
    let guard = 0
    while (this._accumulator >= this.fixedStep && guard++ < 5) {
      for (const fn of this._fixedUpdaters) fn(this.fixedStep, this)
      this._accumulator -= this.fixedStep
    }

    for (const fn of this._updaters) fn(dt, this.time, this)
    this._render(dt)
  }

  _render(dt) {
    for (const fn of this._renderers) fn(dt, this)
    if (this.composer) this.composer.render()
    else this.renderer.render(this.scene, this.camera)
  }

  /** Force a single frame render (useful for static welcome screens). */
  renderOnce() {
    this._render(0)
    return this
  }

  resize() {
    const { width, height } = this._size()
    if (this.camera.isPerspectiveCamera) {
      this.camera.aspect = width / Math.max(1, height)
    }
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height, false)
    this.canvas.style.width = "100%"
    this.canvas.style.height = "100%"
    if (this.composer) this.composer.setSize(width, height)
    for (const fn of this._resizers) fn(width, height, this)
    return this
  }

  /** Returns a PNG data URL of the current frame. */
  screenshot() {
    this._render(0)
    return this.canvas.toDataURL("image/png")
  }

  /** Tear everything down: loop, listeners, GPU resources, DOM node. */
  dispose() {
    this.stop()
    window.removeEventListener("resize", this._onResize)
    document.removeEventListener("visibilitychange", this._onVisibility)
    for (const d of this._disposables) {
      try {
        d.dispose?.()
      } catch {
        /* ignore */
      }
    }
    this.scene.traverse((obj) => {
      obj.geometry?.dispose?.()
      const mat = obj.material
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose?.())
      else mat?.dispose?.()
    })
    this.renderer.dispose()
    this.canvas.remove()
  }
}
