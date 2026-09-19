/**
 * Framework-agnostic math helpers for gameplay code: interpolation, clamping,
 * seeded randomness, angles, and lightweight collision tests. None of this
 * imports Three.js so it stays cheap to load and easy to unit-reason about.
 */

export const TAU = Math.PI * 2

export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value
}

export function lerp(a, b, t) {
  return a + (b - a) * t
}

export function inverseLerp(a, b, value) {
  return a === b ? 0 : (value - a) / (b - a)
}

export function remap(value, inMin, inMax, outMin, outMax) {
  return lerp(outMin, outMax, inverseLerp(inMin, inMax, value))
}

/** Frame-rate independent smoothing. `smoothing` in ~[0.001,0.5]; higher = snappier. */
export function damp(current, target, smoothing, dt) {
  return lerp(current, target, 1 - Math.pow(smoothing, dt))
}

export function smoothstep(edge0, edge1, x) {
  const t = clamp(inverseLerp(edge0, edge1, x), 0, 1)
  return t * t * (3 - 2 * t)
}

export function degToRad(deg) {
  return (deg * Math.PI) / 180
}

export function radToDeg(rad) {
  return (rad * 180) / Math.PI
}

/** Shortest signed angular difference between two angles (radians). */
export function angleDelta(from, to) {
  let d = (to - from) % TAU
  if (d < -Math.PI) d += TAU
  if (d > Math.PI) d -= TAU
  return d
}

export function randRange(min, max) {
  return min + Math.random() * (max - min)
}

export function randInt(min, max) {
  return Math.floor(randRange(min, max + 1))
}

export function pick(array) {
  return array[Math.floor(Math.random() * array.length)]
}

export function shuffle(array) {
  const copy = array.slice()
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/**
 * Deterministic pseudo-random generator (mulberry32). Great for procedural
 * levels you want to reproduce from a seed.
 *
 *   const rng = createRng(1234)
 *   rng()        // 0..1
 *   rng.int(1,6) // dice roll
 */
export function createRng(seed = Date.now()) {
  let state = seed >>> 0
  const rng = () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  rng.range = (min, max) => min + rng() * (max - min)
  rng.int = (min, max) => Math.floor(rng.range(min, max + 1))
  rng.pick = (array) => array[Math.floor(rng() * array.length)]
  return rng
}

/** Axis-aligned bounding box overlap test. Boxes are {x,y,w,h} in 2D. */
export function aabbOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  )
}

/** Circle overlap test. Circles are {x,y,r}. */
export function circleOverlap(a, b) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const r = a.r + b.r
  return dx * dx + dy * dy <= r * r
}

/** 3D sphere overlap given two THREE.Vector3-like points and radii. */
export function sphereOverlap(aPos, aR, bPos, bR) {
  const dx = aPos.x - bPos.x
  const dy = aPos.y - bPos.y
  const dz = aPos.z - bPos.z
  const r = aR + bR
  return dx * dx + dy * dy + dz * dz <= r * r
}
