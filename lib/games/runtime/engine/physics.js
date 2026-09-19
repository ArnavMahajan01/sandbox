import * as THREE from "three"

/**
 * Physics — lightweight, arcade-style physics. This is NOT a rigid-body engine;
 * it is the pragmatic 90% most small games need: gravity, velocity integration,
 * axis-aligned collision resolution against static boxes, ground snapping, and
 * a ready-made platformer/FPS character controller.
 *
 * For heavy simulation, load a real engine (cannon-es, rapier) from a CDN. For
 * most generated games, this is faster to reason about and has zero deps.
 */

/**
 * Body — a moving box with velocity. Wrap any Object3D; the body keeps its
 * position in sync with the mesh.
 */
export class Body {
  constructor(object, options = {}) {
    this.object = object
    this.velocity = new THREE.Vector3()
    this.size = new THREE.Vector3(...(options.size ?? [1, 1, 1]))
    this.gravity = options.gravity ?? -20
    this.useGravity = options.useGravity ?? true
    this.friction = options.friction ?? 8 // ground damping per second
    this.airFriction = options.airFriction ?? 0.5
    this.restitution = options.restitution ?? 0 // bounciness 0..1
    this.grounded = false
    this.isStatic = options.isStatic ?? false
  }

  get position() {
    return this.object.position
  }

  halfExtents() {
    return { x: this.size.x / 2, y: this.size.y / 2, z: this.size.z / 2 }
  }

  aabb() {
    const p = this.object.position
    const h = this.halfExtents()
    return {
      min: new THREE.Vector3(p.x - h.x, p.y - h.y, p.z - h.z),
      max: new THREE.Vector3(p.x + h.x, p.y + h.y, p.z + h.z),
    }
  }
}

function aabbIntersect(a, b) {
  return (
    a.min.x < b.max.x &&
    a.max.x > b.min.x &&
    a.min.y < b.max.y &&
    a.max.y > b.min.y &&
    a.min.z < b.max.z &&
    a.max.z > b.min.z
  )
}

/**
 * World — integrates dynamic bodies against static colliders. Add it once, feed
 * it your bodies, and call step() from engine.onFixedUpdate for stability.
 *
 *   const world = new Physics.World()
 *   const player = world.add(new Physics.Body(playerMesh, { size: [1,2,1] }))
 *   world.addStatic(groundBody)
 *   engine.onFixedUpdate((dt) => world.step(dt))
 */
export class World {
  constructor(options = {}) {
    this.bodies = []
    this.statics = []
    this.gravity = options.gravity ?? -20
    this.onCollision = options.onCollision ?? null // (body, other, axis) => void
  }

  add(body) {
    this.bodies.push(body)
    return body
  }

  addStatic(body) {
    body.isStatic = true
    this.statics.push(body)
    return body
  }

  remove(body) {
    this.bodies = this.bodies.filter((b) => b !== body)
    this.statics = this.statics.filter((b) => b !== body)
  }

  step(dt) {
    for (const body of this.bodies) {
      if (body.isStatic) continue
      this._integrate(body, dt)
    }
  }

  _integrate(body, dt) {
    if (body.useGravity) body.velocity.y += (body.gravity ?? this.gravity) * dt

    body.grounded = false
    // Resolve one axis at a time so we get clean sliding along walls/floors.
    this._moveAxis(body, "x", body.velocity.x * dt)
    this._moveAxis(body, "y", body.velocity.y * dt)
    this._moveAxis(body, "z", body.velocity.z * dt)

    // Apply friction when grounded, light drag in the air.
    const damp = body.grounded ? body.friction : body.airFriction
    const factor = Math.max(0, 1 - damp * dt)
    body.velocity.x *= factor
    body.velocity.z *= factor
  }

  _moveAxis(body, axis, amount) {
    body.object.position[axis] += amount
    const box = body.aabb()
    for (const other of this.statics) {
      const ob = other.aabb()
      if (!aabbIntersect(box, ob)) continue

      const h = body.halfExtents()
      const oh = other.halfExtents()
      const bp = body.object.position
      const op = other.object.position

      if (amount > 0) {
        bp[axis] = op[axis] - oh[axis] - h[axis]
      } else if (amount < 0) {
        bp[axis] = op[axis] + oh[axis] + h[axis]
        if (axis === "y") body.grounded = true
      }
      if (body.restitution > 0) body.velocity[axis] *= -body.restitution
      else body.velocity[axis] = 0
      this.onCollision?.(body, other, axis)
      box.min.copy(body.aabb().min)
      box.max.copy(body.aabb().max)
    }
  }
}

/**
 * CharacterController — a platformer/FPS-friendly controller built on Body.
 * Feed it a desired move direction and it handles acceleration, jumping (with
 * coyote time + jump buffering), and gravity via the World.
 *
 *   const cc = new Physics.CharacterController(body, { speed: 6, jumpHeight: 2 })
 *   engine.onUpdate((dt) => {
 *     const m = input.axis2()
 *     cc.move(m.x, m.y, input.justPressed("jump"), dt)
 *   })
 */
export class CharacterController {
  constructor(body, options = {}) {
    this.body = body
    this.speed = options.speed ?? 6
    this.acceleration = options.acceleration ?? 40
    this.jumpHeight = options.jumpHeight ?? 2
    this.coyoteTime = options.coyoteTime ?? 0.1
    this.jumpBuffer = options.jumpBuffer ?? 0.1
    this._coyote = 0
    this._buffer = 0
  }

  get jumpVelocity() {
    // v = sqrt(2 * g * h)
    return Math.sqrt(2 * Math.abs(this.body.gravity) * this.jumpHeight)
  }

  /**
   * moveX/moveZ in [-1,1] (world space); jumpPressed true on the frame jump was
   * requested. Yaw optionally rotates the move vector to be camera-relative.
   */
  move(moveX, moveZ, jumpPressed, dt, yaw = 0) {
    const body = this.body
    // Camera-relative direction.
    const cos = Math.cos(yaw)
    const sin = Math.sin(yaw)
    const dirX = moveX * cos - moveZ * sin
    const dirZ = moveX * sin + moveZ * cos

    const targetX = dirX * this.speed
    const targetZ = dirZ * this.speed
    body.velocity.x += (targetX - body.velocity.x) * Math.min(1, this.acceleration * dt * 0.05)
    body.velocity.z += (targetZ - body.velocity.z) * Math.min(1, this.acceleration * dt * 0.05)

    this._coyote = body.grounded ? this.coyoteTime : Math.max(0, this._coyote - dt)
    if (jumpPressed) this._buffer = this.jumpBuffer
    else this._buffer = Math.max(0, this._buffer - dt)

    if (this._buffer > 0 && this._coyote > 0) {
      body.velocity.y = this.jumpVelocity
      this._buffer = 0
      this._coyote = 0
    }
  }
}

/**
 * Raycaster helper: shoots from the camera through the current pointer and
 * returns the first hit among `objects`. Great for click-to-select and shooting.
 *
 *   const hit = pointerPick(engine, input, targets)
 *   if (hit) hit.object.material.color.set(0xff0000)
 */
export function pointerPick(engine, input, objects, options = {}) {
  const ray = pointerPick._ray ?? (pointerPick._ray = new THREE.Raycaster())
  ray.setFromCamera(input.mouse, engine.camera)
  const hits = ray.intersectObjects(objects, options.recursive ?? true)
  return hits[0] ?? null
}

/** Ground/wall probe: cast a ray from `origin` in `direction`, return distance. */
export function raycast(origin, direction, objects, maxDistance = Infinity) {
  const ray = raycast._ray ?? (raycast._ray = new THREE.Raycaster())
  ray.set(origin, direction.clone().normalize())
  ray.far = maxDistance
  const hits = ray.intersectObjects(objects, true)
  return hits[0] ?? null
}

export const Physics = { Body, World, CharacterController, pointerPick, raycast }
