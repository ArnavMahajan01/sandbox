import * as THREE from "three"

import { BRAND } from "./brand.js"

/**
 * Models — factories for meshes and primitives, plus loaders for external
 * assets. The primitive helpers all cast/receive shadows by default so scenes
 * look grounded without extra wiring.
 */

function standard(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.6,
    metalness: options.metalness ?? 0.1,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 1,
    flatShading: options.flatShading ?? false,
    transparent: options.opacity != null && options.opacity < 1,
    opacity: options.opacity ?? 1,
  })
}

function finishMesh(mesh, options) {
  mesh.castShadow = options.castShadow ?? true
  mesh.receiveShadow = options.receiveShadow ?? true
  if (options.position) mesh.position.set(...options.position)
  if (options.rotation) mesh.rotation.set(...options.rotation)
  if (options.scale != null) {
    if (Array.isArray(options.scale)) mesh.scale.set(...options.scale)
    else mesh.scale.setScalar(options.scale)
  }
  if (options.name) mesh.name = options.name
  return mesh
}

export function box(options = {}) {
  const { width = 1, height = 1, depth = 1, color = BRAND.orange } = options
  const geo = new THREE.BoxGeometry(width, height, depth)
  return finishMesh(new THREE.Mesh(geo, standard(color, options)), options)
}

export function sphere(options = {}) {
  const { radius = 0.5, segments = 32, color = BRAND.amber } = options
  const geo = new THREE.SphereGeometry(radius, segments, segments)
  return finishMesh(new THREE.Mesh(geo, standard(color, options)), options)
}

export function cylinder(options = {}) {
  const { radiusTop = 0.5, radiusBottom = 0.5, height = 1, segments = 24, color = BRAND.violet } = options
  const geo = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments)
  return finishMesh(new THREE.Mesh(geo, standard(color, options)), options)
}

export function capsule(options = {}) {
  const { radius = 0.5, length = 1, capSegments = 8, radialSegments = 16, color = BRAND.orange } = options
  const geo = new THREE.CapsuleGeometry(radius, length, capSegments, radialSegments)
  return finishMesh(new THREE.Mesh(geo, standard(color, options)), options)
}

export function cone(options = {}) {
  const { radius = 0.5, height = 1, segments = 24, color = BRAND.ember } = options
  const geo = new THREE.ConeGeometry(radius, height, segments)
  return finishMesh(new THREE.Mesh(geo, standard(color, options)), options)
}

export function plane(options = {}) {
  const { width = 1, height = 1, color = BRAND.slate } = options
  const geo = new THREE.PlaneGeometry(width, height)
  const mesh = new THREE.Mesh(geo, standard(color, { ...options, roughness: options.roughness ?? 0.9 }))
  return finishMesh(mesh, { castShadow: false, ...options })
}

export function torus(options = {}) {
  const { radius = 0.6, tube = 0.2, radialSegments = 16, tubularSegments = 48, color = BRAND.sky } = options
  const geo = new THREE.TorusGeometry(radius, tube, radialSegments, tubularSegments)
  return finishMesh(new THREE.Mesh(geo, standard(color, options)), options)
}

/**
 * A blocky humanoid built from primitives — a good placeholder "player" or NPC
 * until real art is added. Returns a Group with named parts (body, head, arms,
 * legs) so you can animate them. See animation.js walkCycle().
 */
export function character(options = {}) {
  const {
    color = BRAND.orange,
    accent = BRAND.cream,
    height = 1.8,
  } = options
  const group = new THREE.Group()
  const s = height / 1.8 // scale factor from the reference height

  const bodyMat = standard(color, options)
  const accentMat = standard(accent, options)

  const torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(0.6 * s, 0.7 * s, 0.35 * s), bodyMat)
  torsoMesh.position.y = 1.0 * s
  torsoMesh.name = "body"

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.32 * s, 0.32 * s, 0.32 * s), accentMat)
  head.position.y = 1.55 * s
  head.name = "head"

  const makeLimb = (w, h, d, name) => {
    const pivot = new THREE.Group()
    pivot.name = name
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bodyMat)
    mesh.position.y = -h / 2
    pivot.add(mesh)
    return pivot
  }

  const armL = makeLimb(0.16 * s, 0.6 * s, 0.16 * s, "armL")
  armL.position.set(-0.42 * s, 1.32 * s, 0)
  const armR = makeLimb(0.16 * s, 0.6 * s, 0.16 * s, "armR")
  armR.position.set(0.42 * s, 1.32 * s, 0)
  const legL = makeLimb(0.2 * s, 0.65 * s, 0.2 * s, "legL")
  legL.position.set(-0.16 * s, 0.65 * s, 0)
  const legR = makeLimb(0.2 * s, 0.65 * s, 0.2 * s, "legR")
  legR.position.set(0.16 * s, 0.65 * s, 0)

  group.add(torsoMesh, head, armL, armR, legL, legR)
  group.traverse((o) => {
    o.castShadow = true
    o.receiveShadow = true
  })
  group.userData.parts = { body: torsoMesh, head, armL, armR, legL, legR }
  if (options.position) group.position.set(...options.position)
  return group
}

/**
 * Draw text as a flat, always-facing-camera sprite. Handy for floating labels,
 * damage numbers, and simple in-world UI without any font assets.
 */
export function textSprite(text, options = {}) {
  const {
    color = "#fff7ed",
    background = "rgba(11,11,15,0.6)",
    fontSize = 64,
    padding = 24,
    scale = 1,
  } = options
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")
  ctx.font = `bold ${fontSize}px system-ui, sans-serif`
  const width = ctx.measureText(text).width + padding * 2
  canvas.width = width
  canvas.height = fontSize + padding * 2
  ctx.font = `bold ${fontSize}px system-ui, sans-serif`
  ctx.fillStyle = background
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = color
  ctx.textBaseline = "middle"
  ctx.fillText(text, padding, canvas.height / 2)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false })
  const sprite = new THREE.Sprite(material)
  sprite.scale.set((canvas.width / canvas.height) * scale, scale, 1)
  sprite.userData.setText = (next) => {
    // Repaint the canvas for dynamic labels (score, damage numbers).
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = background
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = color
    ctx.fillText(next, padding, canvas.height / 2)
    texture.needsUpdate = true
  }
  return sprite
}

/**
 * InstancedField — efficiently render many copies of one mesh (coins, trees,
 * bullets, foliage) in a single draw call.
 *
 *   const field = new InstancedField(geo, mat, 500)
 *   field.setAt(0, { position: [x,y,z], scale: 1 })
 *   engine.add(field.mesh)
 */
export class InstancedField {
  constructor(geometry, material, count) {
    this.mesh = new THREE.InstancedMesh(geometry, material, count)
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.mesh.castShadow = true
    this.mesh.receiveShadow = true
    this._m = new THREE.Matrix4()
    this._p = new THREE.Vector3()
    this._q = new THREE.Quaternion()
    this._s = new THREE.Vector3(1, 1, 1)
    this._e = new THREE.Euler()
  }

  setAt(index, { position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 } = {}) {
    this._p.set(...position)
    this._e.set(...rotation)
    this._q.setFromEuler(this._e)
    if (Array.isArray(scale)) this._s.set(...scale)
    else this._s.setScalar(scale)
    this._m.compose(this._p, this._q, this._s)
    this.mesh.setMatrixAt(index, this._m)
    this.mesh.instanceMatrix.needsUpdate = true
  }

  setColorAt(index, color) {
    this.mesh.setColorAt(index, new THREE.Color(color))
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true
  }
}

/**
 * Load a GLTF/GLB model from a URL (must be a public CDN in the sandbox).
 * Returns { scene, animations, gltf }.
 *
 *   const { scene, animations } = await loadModel("https://.../duck.glb")
 *   engine.add(scene)
 */
export async function loadModel(url, options = {}) {
  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js")
  const loader = new GLTFLoader()
  if (options.draco) {
    const { DRACOLoader } = await import("three/addons/loaders/DRACOLoader.js")
    const draco = new DRACOLoader()
    draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.6/")
    loader.setDRACOLoader(draco)
  }
  const gltf = await loader.loadAsync(url)
  gltf.scene.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true
      o.receiveShadow = true
    }
  })
  return { scene: gltf.scene, animations: gltf.animations, gltf }
}

/** Load a texture from a URL and set sane defaults. */
export async function loadTexture(url, options = {}) {
  const loader = new THREE.TextureLoader()
  const texture = await loader.loadAsync(url)
  texture.colorSpace = options.data ? THREE.NoColorSpace : THREE.SRGBColorSpace
  if (options.repeat) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(...options.repeat)
  }
  texture.anisotropy = options.anisotropy ?? 8
  return texture
}
