import * as THREE from "three"

/**
 * Input — a unified input manager covering keyboard, mouse, pointer lock, and
 * touch, with an action-mapping layer so gameplay reads intent ("jump") rather
 * than raw keys ("Space").
 *
 *   const input = new Input(engine.canvas)
 *   input.bind("jump", ["Space", "KeyW"])
 *   // in update:
 *   if (input.justPressed("jump")) player.jump()
 *   const move = input.axis2()  // WASD/arrows -> {x,y} in [-1,1]
 *
 * Call input.update() at the END of your frame (Input can do this for you if
 * you pass an Engine to attach()).
 */
export class Input {
  constructor(target = window) {
    this.target = target
    this.keys = new Set() // currently held key codes
    this._pressedThisFrame = new Set()
    this._releasedThisFrame = new Set()
    this.actions = new Map() // name -> [codes]

    this.mouse = new THREE.Vector2() // normalized device coords (-1..1)
    this.mousePixel = new THREE.Vector2() // pixel coords within target
    this.mouseDelta = new THREE.Vector2() // movement since last frame
    this.wheel = 0
    this.buttons = new Set() // held mouse buttons (0 left,1 mid,2 right)
    this._mousePressed = new Set()
    this._mouseReleased = new Set()

    this.pointerLocked = false
    this.touches = new Map()

    this._bindEvents()
  }

  _rect() {
    if (this.target === window || this.target === document) {
      return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }
    }
    return this.target.getBoundingClientRect()
  }

  _updatePointer(clientX, clientY) {
    const rect = this._rect()
    const x = clientX - rect.left
    const y = clientY - rect.top
    this.mousePixel.set(x, y)
    this.mouse.set((x / rect.width) * 2 - 1, -(y / rect.height) * 2 + 1)
  }

  _bindEvents() {
    const t = this.target
    this._onKeyDown = (e) => {
      if (!this.keys.has(e.code)) this._pressedThisFrame.add(e.code)
      this.keys.add(e.code)
    }
    this._onKeyUp = (e) => {
      this.keys.delete(e.code)
      this._releasedThisFrame.add(e.code)
    }
    this._onMouseMove = (e) => {
      if (this.pointerLocked) {
        this.mouseDelta.x += e.movementX
        this.mouseDelta.y += e.movementY
      } else {
        this._updatePointer(e.clientX, e.clientY)
      }
    }
    this._onMouseDown = (e) => {
      this.buttons.add(e.button)
      this._mousePressed.add(e.button)
    }
    this._onMouseUp = (e) => {
      this.buttons.delete(e.button)
      this._mouseReleased.add(e.button)
    }
    this._onWheel = (e) => {
      this.wheel += Math.sign(e.deltaY)
    }
    this._onContext = (e) => e.preventDefault()
    this._onPointerLockChange = () => {
      this.pointerLocked = document.pointerLockElement === (t.requestPointerLock ? t : document.body)
    }
    this._onTouchStart = (e) => {
      for (const touch of e.changedTouches) {
        this.touches.set(touch.identifier, { x: touch.clientX, y: touch.clientY, startX: touch.clientX, startY: touch.clientY })
      }
    }
    this._onTouchMove = (e) => {
      for (const touch of e.changedTouches) {
        const t2 = this.touches.get(touch.identifier)
        if (t2) {
          t2.x = touch.clientX
          t2.y = touch.clientY
        }
      }
    }
    this._onTouchEnd = (e) => {
      for (const touch of e.changedTouches) this.touches.delete(touch.identifier)
    }

    window.addEventListener("keydown", this._onKeyDown)
    window.addEventListener("keyup", this._onKeyUp)
    t.addEventListener("mousemove", this._onMouseMove)
    t.addEventListener("mousedown", this._onMouseDown)
    window.addEventListener("mouseup", this._onMouseUp)
    t.addEventListener("wheel", this._onWheel, { passive: true })
    t.addEventListener?.("contextmenu", this._onContext)
    document.addEventListener("pointerlockchange", this._onPointerLockChange)
    t.addEventListener?.("touchstart", this._onTouchStart, { passive: true })
    t.addEventListener?.("touchmove", this._onTouchMove, { passive: true })
    t.addEventListener?.("touchend", this._onTouchEnd, { passive: true })
    t.addEventListener?.("touchcancel", this._onTouchEnd, { passive: true })
  }

  /** Map an action name to one or more key codes. */
  bind(action, codes) {
    this.actions.set(action, Array.isArray(codes) ? codes : [codes])
    return this
  }

  /** Convenience: apply a whole map of { action: codes } at once. */
  bindMap(map) {
    for (const [action, codes] of Object.entries(map)) this.bind(action, codes)
    return this
  }

  _codesFor(action) {
    return this.actions.get(action) ?? [action]
  }

  /** Is the action (or raw code) currently held? */
  isDown(action) {
    return this._codesFor(action).some((c) => this.keys.has(c))
  }

  /** Did the action go down this frame? */
  justPressed(action) {
    return this._codesFor(action).some((c) => this._pressedThisFrame.has(c))
  }

  /** Was the action released this frame? */
  justReleased(action) {
    return this._codesFor(action).some((c) => this._releasedThisFrame.has(c))
  }

  mouseDown(button = 0) {
    return this.buttons.has(button)
  }

  mousePressed(button = 0) {
    return this._mousePressed.has(button)
  }

  mouseReleased(button = 0) {
    return this._mouseReleased.has(button)
  }

  /** WASD + arrow keys as a normalized {x,y} vector (y is +forward). */
  axis2() {
    let x = 0
    let y = 0
    if (this.isDown("KeyA") || this.isDown("ArrowLeft")) x -= 1
    if (this.isDown("KeyD") || this.isDown("ArrowRight")) x += 1
    if (this.isDown("KeyW") || this.isDown("ArrowUp")) y += 1
    if (this.isDown("KeyS") || this.isDown("ArrowDown")) y -= 1
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.sqrt(2)
      x *= inv
      y *= inv
    }
    return { x, y }
  }

  /** Request pointer lock on the target (call from a click handler). */
  lockPointer() {
    ;(this.target.requestPointerLock ? this.target : document.body).requestPointerLock?.()
  }

  unlockPointer() {
    document.exitPointerLock?.()
  }

  /**
   * Clears per-frame state. Call once at the very end of each frame. When
   * attached to an Engine this is registered automatically.
   */
  update() {
    this._pressedThisFrame.clear()
    this._releasedThisFrame.clear()
    this._mousePressed.clear()
    this._mouseReleased.clear()
    this.mouseDelta.set(0, 0)
    this.wheel = 0
  }

  /** Attach to an Engine so update() runs after all game logic each frame. */
  attach(engine) {
    // Priority: register as the last updater by wrapping onRender (post-update).
    engine.onRender(() => this.update())
    return this
  }

  dispose() {
    const t = this.target
    window.removeEventListener("keydown", this._onKeyDown)
    window.removeEventListener("keyup", this._onKeyUp)
    t.removeEventListener("mousemove", this._onMouseMove)
    t.removeEventListener("mousedown", this._onMouseDown)
    window.removeEventListener("mouseup", this._onMouseUp)
    t.removeEventListener("wheel", this._onWheel)
    t.removeEventListener?.("contextmenu", this._onContext)
    document.removeEventListener("pointerlockchange", this._onPointerLockChange)
    t.removeEventListener?.("touchstart", this._onTouchStart)
    t.removeEventListener?.("touchmove", this._onTouchMove)
    t.removeEventListener?.("touchend", this._onTouchEnd)
    t.removeEventListener?.("touchcancel", this._onTouchEnd)
  }
}

/**
 * VirtualJoystick — an on-screen thumbstick for touch (and mouse) controls.
 * Renders a small DOM widget and reports a normalized {x,y} vector.
 *
 *   const stick = new VirtualJoystick({ side: "left" })
 *   const v = stick.value  // {x,y} each in [-1,1]
 */
export class VirtualJoystick {
  constructor(options = {}) {
    const {
      parent = document.body,
      side = "left",
      size = 120,
      color = "rgba(234,88,12,0.35)",
      knobColor = "rgba(255,247,237,0.9)",
    } = options
    this.value = { x: 0, y: 0 }
    this.active = false
    this._id = null
    this.radius = size / 2

    const base = document.createElement("div")
    Object.assign(base.style, {
      position: "fixed",
      bottom: "24px",
      [side]: "24px",
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: "50%",
      background: color,
      touchAction: "none",
      zIndex: 50,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      userSelect: "none",
    })
    const knob = document.createElement("div")
    Object.assign(knob.style, {
      width: `${size * 0.42}px`,
      height: `${size * 0.42}px`,
      borderRadius: "50%",
      background: knobColor,
      transition: "transform 0.02s linear",
    })
    base.appendChild(knob)
    parent.appendChild(base)
    this.el = base
    this.knob = knob

    const start = (x, y, id) => {
      this.active = true
      this._id = id
      this._origin = { x, y }
    }
    const move = (x, y) => {
      if (!this.active) return
      let dx = x - this._origin.x
      let dy = y - this._origin.y
      const len = Math.hypot(dx, dy)
      if (len > this.radius) {
        dx = (dx / len) * this.radius
        dy = (dy / len) * this.radius
      }
      this.value.x = dx / this.radius
      this.value.y = -dy / this.radius
      this.knob.style.transform = `translate(${dx}px, ${dy}px)`
    }
    const end = () => {
      this.active = false
      this._id = null
      this.value.x = 0
      this.value.y = 0
      this.knob.style.transform = "translate(0,0)"
    }

    base.addEventListener("touchstart", (e) => {
      const t = e.changedTouches[0]
      start(t.clientX, t.clientY, t.identifier)
    }, { passive: true })
    base.addEventListener("touchmove", (e) => {
      for (const t of e.changedTouches) if (t.identifier === this._id) move(t.clientX, t.clientY)
    }, { passive: true })
    base.addEventListener("touchend", end, { passive: true })
    base.addEventListener("mousedown", (e) => start(e.clientX, e.clientY, "mouse"))
    window.addEventListener("mousemove", (e) => this._id === "mouse" && move(e.clientX, e.clientY))
    window.addEventListener("mouseup", () => this._id === "mouse" && end())
  }

  show() {
    this.el.style.display = "flex"
  }

  hide() {
    this.el.style.display = "none"
  }

  dispose() {
    this.el.remove()
  }
}
