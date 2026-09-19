import * as THREE from "three"

/**
 * Camera controllers. Everything here is self-contained and driven by the
 * Input manager, except createOrbitControls which wraps Three's official addon.
 */

/**
 * OrbitControls from the official addons — mouse-drag orbit, wheel zoom, pan.
 * Great for menus, model viewers, and strategy games.
 *
 *   const controls = await createOrbitControls(engine)
 *   engine.onUpdate(() => controls.update())
 */
export async function createOrbitControls(engine, options = {}) {
  const { OrbitControls } = await import("three/addons/controls/OrbitControls.js")
  const controls = new OrbitControls(engine.camera, engine.renderer.domElement)
  controls.enableDamping = options.damping ?? true
  controls.dampingFactor = options.dampingFactor ?? 0.08
  if (options.target) controls.target.set(...options.target)
  if (options.minDistance != null) controls.minDistance = options.minDistance
  if (options.maxDistance != null) controls.maxDistance = options.maxDistance
  if (options.autoRotate) {
    controls.autoRotate = true
    controls.autoRotateSpeed = options.autoRotateSpeed ?? 1
  }
  controls.update()
  engine.track(controls)
  return controls
}

/**
 * FirstPersonController — WASD movement + mouse-look via pointer lock. Attach it
 * to the engine and it moves the camera each frame.
 *
 *   const fps = new FirstPersonController(engine, input, { speed: 6 })
 *   engine.canvas.addEventListener("click", () => input.lockPointer())
 *   engine.onUpdate((dt) => fps.update(dt))
 */
export class FirstPersonController {
  constructor(engine, input, options = {}) {
    this.engine = engine
    this.input = input
    this.speed = options.speed ?? 6
    this.sprintMultiplier = options.sprintMultiplier ?? 1.8
    this.sensitivity = options.sensitivity ?? 0.0022
    this.eyeHeight = options.eyeHeight ?? 1.7
    this.yaw = options.yaw ?? 0
    this.pitch = options.pitch ?? 0
    this.maxPitch = options.maxPitch ?? Math.PI / 2 - 0.05
    this._euler = new THREE.Euler(0, 0, 0, "YXZ")
    if (options.position) engine.camera.position.set(...options.position)
    else engine.camera.position.y = this.eyeHeight
  }

  update(dt) {
    const { input, engine } = this
    // Look
    this.yaw -= input.mouseDelta.x * this.sensitivity
    this.pitch -= input.mouseDelta.y * this.sensitivity
    this.pitch = Math.max(-this.maxPitch, Math.min(this.maxPitch, this.pitch))
    this._euler.set(this.pitch, this.yaw, 0)
    engine.camera.quaternion.setFromEuler(this._euler)

    // Move on the horizontal plane relative to yaw
    const move = input.axis2()
    const speed = this.speed * (input.isDown("ShiftLeft") ? this.sprintMultiplier : 1) * dt
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw))
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw))
    engine.camera.position.addScaledVector(forward, move.y * speed)
    engine.camera.position.addScaledVector(right, move.x * speed)
  }
}

/**
 * ThirdPersonCamera — smoothly follows a target Object3D from behind/above with
 * optional mouse orbit. Set `target` to your player mesh.
 *
 *   const cam = new ThirdPersonCamera(engine, player, { distance: 8, height: 4 })
 *   engine.onUpdate((dt) => cam.update(dt))
 */
export class ThirdPersonCamera {
  constructor(engine, target, options = {}) {
    this.engine = engine
    this.target = target
    this.distance = options.distance ?? 8
    this.height = options.height ?? 4
    this.smoothing = options.smoothing ?? 0.001 // lower = snappier
    this.lookAtOffset = new THREE.Vector3(0, options.lookHeight ?? 1.5, 0)
    this.orbitInput = options.input ?? null
    this.orbitSpeed = options.orbitSpeed ?? 0.004
    this.yaw = options.yaw ?? 0
    this._desired = new THREE.Vector3()
    this._look = new THREE.Vector3()
  }

  update(dt) {
    if (this.orbitInput?.mouseDown(2)) {
      this.yaw -= this.orbitInput.mouseDelta.x * this.orbitSpeed
    }
    const tp = this.target.position
    const offset = new THREE.Vector3(
      Math.sin(this.yaw) * this.distance,
      this.height,
      Math.cos(this.yaw) * this.distance
    )
    this._desired.copy(tp).add(offset)
    const t = 1 - Math.pow(this.smoothing, dt)
    this.engine.camera.position.lerp(this._desired, t)
    this._look.copy(tp).add(this.lookAtOffset)
    this.engine.camera.lookAt(this._look)
  }
}

/**
 * TopDownCamera — looks straight (or angled) down at a target. Ideal for twin-
 * stick shooters, RTS, and puzzle games.
 */
export class TopDownCamera {
  constructor(engine, target, options = {}) {
    this.engine = engine
    this.target = target
    this.height = options.height ?? 18
    this.angle = options.angle ?? 0 // 0 = straight down; radians tilt back
    this.smoothing = options.smoothing ?? 0.001
    this.offset = new THREE.Vector3(0, this.height, Math.tan(this.angle) * this.height)
    this._desired = new THREE.Vector3()
  }

  update(dt) {
    const tp = this.target.position ?? this.target
    this._desired.copy(tp).add(this.offset)
    const t = 1 - Math.pow(this.smoothing, dt)
    this.engine.camera.position.lerp(this._desired, t)
    this.engine.camera.lookAt(tp.x ?? tp[0], (tp.y ?? tp[1]) || 0, tp.z ?? tp[2])
  }
}
