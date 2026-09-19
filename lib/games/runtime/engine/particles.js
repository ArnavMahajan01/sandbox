import * as THREE from "three"

import { BRAND } from "./brand.js"

/**
 * Particles — a pooled, GPU-friendly particle system built on THREE.Points.
 * One system = one draw call. Use it for explosions, sparks, smoke, trails,
 * magic, and ambient effects. Emit bursts or a steady stream, then call
 * update(dt) each frame.
 *
 *   const fx = new ParticleSystem(engine.scene, { max: 600 })
 *   engine.onUpdate((dt) => fx.update(dt))
 *   fx.burst({ position: hit.point, count: 40, color: 0xf59e0b })
 */
export class ParticleSystem {
  constructor(scene, options = {}) {
    this.max = options.max ?? 500
    this.gravity = options.gravity ?? -9.8
    this.count = 0

    this.positions = new Float32Array(this.max * 3)
    this.colors = new Float32Array(this.max * 3)
    // Per-particle CPU state kept parallel to the GPU buffers.
    this._vel = new Float32Array(this.max * 3)
    this._life = new Float32Array(this.max)
    this._maxLife = new Float32Array(this.max)
    this._size = new Float32Array(this.max)
    this._drag = new Float32Array(this.max)

    this.geometry = new THREE.BufferGeometry()
    this.geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3))
    this.geometry.setAttribute("color", new THREE.BufferAttribute(this.colors, 3))

    this.material = new THREE.PointsMaterial({
      size: options.size ?? 0.3,
      vertexColors: true,
      transparent: true,
      opacity: options.opacity ?? 0.9,
      depthWrite: false,
      blending: options.additive === false ? THREE.NormalBlending : THREE.AdditiveBlending,
      sizeAttenuation: true,
      map: options.texture ?? ParticleSystem._softDisc(),
    })

    this.points = new THREE.Points(this.geometry, this.material)
    this.points.frustumCulled = false
    scene.add(this.points)
    this._tmp = new THREE.Color()
  }

  static _softDisc() {
    if (ParticleSystem._disc) return ParticleSystem._disc
    const size = 64
    const canvas = document.createElement("canvas")
    canvas.width = canvas.height = size
    const ctx = canvas.getContext("2d")
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    grad.addColorStop(0, "rgba(255,255,255,1)")
    grad.addColorStop(0.4, "rgba(255,255,255,0.6)")
    grad.addColorStop(1, "rgba(255,255,255,0)")
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, size, size)
    const tex = new THREE.CanvasTexture(canvas)
    ParticleSystem._disc = tex
    return tex
  }

  _spawn(px, py, pz, vx, vy, vz, color, life, size, drag) {
    // Reuse a dead slot if possible, otherwise append (up to max).
    let i = -1
    for (let s = 0; s < this.count; s++) {
      if (this._life[s] <= 0) {
        i = s
        break
      }
    }
    if (i === -1) {
      if (this.count >= this.max) return
      i = this.count++
    }
    this.positions[i * 3] = px
    this.positions[i * 3 + 1] = py
    this.positions[i * 3 + 2] = pz
    this._vel[i * 3] = vx
    this._vel[i * 3 + 1] = vy
    this._vel[i * 3 + 2] = vz
    this._tmp.set(color)
    this.colors[i * 3] = this._tmp.r
    this.colors[i * 3 + 1] = this._tmp.g
    this.colors[i * 3 + 2] = this._tmp.b
    this._life[i] = life
    this._maxLife[i] = life
    this._size[i] = size
    this._drag[i] = drag
  }

  /** Emit an outward burst from a point (explosion, impact, pickup pop). */
  burst(options = {}) {
    const {
      position = [0, 0, 0],
      count = 30,
      color = BRAND.amber,
      speed = 6,
      spread = 1,
      life = 0.8,
      size = 1,
      drag = 1.5,
      gravity = true,
    } = options
    const [px, py, pz] = position.isVector3 ? [position.x, position.y, position.z] : position
    for (let i = 0; i < count; i++) {
      const dir = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1
      ).normalize()
      const s = speed * (1 - Math.random() * spread * 0.5)
      this._spawn(
        px,
        py,
        pz,
        dir.x * s,
        dir.y * s + (gravity ? 1 : 0),
        dir.z * s,
        color,
        life * (0.6 + Math.random() * 0.4),
        size * (0.6 + Math.random() * 0.6),
        drag
      )
    }
    this._markDirty()
  }

  /** Emit a single particle (call repeatedly for trails/streams). */
  emit(position, velocity, options = {}) {
    const [px, py, pz] = position.isVector3 ? [position.x, position.y, position.z] : position
    const [vx, vy, vz] = velocity.isVector3 ? [velocity.x, velocity.y, velocity.z] : velocity
    this._spawn(px, py, pz, vx, vy, vz, options.color ?? BRAND.orange, options.life ?? 0.6, options.size ?? 1, options.drag ?? 1)
    this._markDirty()
  }

  update(dt) {
    let anyAlive = false
    for (let i = 0; i < this.count; i++) {
      if (this._life[i] <= 0) continue
      anyAlive = true
      this._life[i] -= dt
      const drag = Math.max(0, 1 - this._drag[i] * dt)
      this._vel[i * 3] *= drag
      this._vel[i * 3 + 1] = this._vel[i * 3 + 1] * drag + this.gravity * dt
      this._vel[i * 3 + 2] *= drag
      this.positions[i * 3] += this._vel[i * 3] * dt
      this.positions[i * 3 + 1] += this._vel[i * 3 + 1] * dt
      this.positions[i * 3 + 2] += this._vel[i * 3 + 2] * dt
      if (this._life[i] <= 0) {
        // Hide dead particles far away so they aren't rendered.
        this.positions[i * 3 + 1] = 1e6
      }
    }
    if (anyAlive) this._markDirty()
  }

  _markDirty() {
    this.geometry.attributes.position.needsUpdate = true
    this.geometry.attributes.color.needsUpdate = true
    this.geometry.setDrawRange(0, this.count)
  }

  dispose() {
    this.geometry.dispose()
    this.material.dispose()
    this.points.parent?.remove(this.points)
  }
}

/**
 * Trail — a fading line that follows a moving object. Cheap motion emphasis for
 * projectiles, dashes, and comets.
 */
export class Trail {
  constructor(scene, options = {}) {
    this.length = options.length ?? 20
    this._points = []
    this.geometry = new THREE.BufferGeometry()
    this._positions = new Float32Array(this.length * 3)
    this.geometry.setAttribute("position", new THREE.BufferAttribute(this._positions, 3))
    this.material = new THREE.LineBasicMaterial({
      color: options.color ?? BRAND.orange,
      transparent: true,
      opacity: options.opacity ?? 0.8,
    })
    this.line = new THREE.Line(this.geometry, this.material)
    this.line.frustumCulled = false
    scene.add(this.line)
  }

  push(position) {
    const p = position.isVector3 ? position : { x: position[0], y: position[1], z: position[2] }
    this._points.unshift([p.x, p.y, p.z])
    if (this._points.length > this.length) this._points.pop()
    for (let i = 0; i < this._points.length; i++) {
      this._positions[i * 3] = this._points[i][0]
      this._positions[i * 3 + 1] = this._points[i][1]
      this._positions[i * 3 + 2] = this._points[i][2]
    }
    this.geometry.setDrawRange(0, this._points.length)
    this.geometry.attributes.position.needsUpdate = true
  }

  dispose() {
    this.geometry.dispose()
    this.material.dispose()
    this.line.parent?.remove(this.line)
  }
}
