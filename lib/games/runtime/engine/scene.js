import * as THREE from "three"

import { BRAND } from "./brand.js"

/**
 * Scene dressing helpers: one-call lighting rigs, ground planes, grids, sky
 * gradients, and fog. These cover the "make it look decent instantly" needs so
 * gameplay code can focus on mechanics.
 */

/**
 * A sensible three-point-ish lighting rig: soft hemisphere fill, a warm key
 * directional light that casts shadows, and a subtle cool rim. Returns the
 * created lights so you can tweak them.
 */
export function addLighting(scene, options = {}) {
  const {
    sky = 0xbcd3ff,
    ground = 0x2a2a35,
    hemiIntensity = 0.6,
    keyColor = 0xfff2e0,
    keyIntensity = 2.2,
    keyPosition = [6, 12, 8],
    rimColor = BRAND.violet,
    rimIntensity = 0.5,
    shadows = true,
    shadowSize = 30,
  } = options

  const hemi = new THREE.HemisphereLight(sky, ground, hemiIntensity)
  scene.add(hemi)

  const key = new THREE.DirectionalLight(keyColor, keyIntensity)
  key.position.set(...keyPosition)
  if (shadows) {
    key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    key.shadow.camera.near = 0.5
    key.shadow.camera.far = 100
    key.shadow.camera.left = -shadowSize
    key.shadow.camera.right = shadowSize
    key.shadow.camera.top = shadowSize
    key.shadow.camera.bottom = -shadowSize
    key.shadow.bias = -0.0005
    key.shadow.normalBias = 0.02
  }
  scene.add(key)

  const rim = new THREE.DirectionalLight(rimColor, rimIntensity)
  rim.position.set(-8, 6, -6)
  scene.add(rim)

  return { hemi, key, rim }
}

/**
 * A flat ground plane that receives shadows. Returns the mesh.
 */
export function addGround(scene, options = {}) {
  const {
    size = 200,
    color = BRAND.slate,
    roughness = 0.95,
    metalness = 0,
    y = 0,
    receiveShadow = true,
  } = options

  const geo = new THREE.PlaneGeometry(size, size)
  const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y = y
  mesh.receiveShadow = receiveShadow
  scene.add(mesh)
  return mesh
}

/**
 * A grid helper themed in brand colors. Handy for prototyping and top-down games.
 */
export function addGrid(scene, options = {}) {
  const {
    size = 100,
    divisions = 100,
    color = BRAND.orange,
    subColor = 0x333340,
    y = 0.001,
  } = options
  const grid = new THREE.GridHelper(size, divisions, color, subColor)
  grid.position.y = y
  grid.material.opacity = 0.35
  grid.material.transparent = true
  scene.add(grid)
  return grid
}

/**
 * Paints a smooth vertical gradient background into the scene (top -> bottom)
 * by rendering it onto a canvas texture. Cheaper and prettier than a solid color.
 */
export function setGradientBackground(scene, top = BRAND.ink, bottom = BRAND.ember) {
  const canvas = document.createElement("canvas")
  canvas.width = 2
  canvas.height = 256
  const ctx = canvas.getContext("2d")
  const grad = ctx.createLinearGradient(0, 0, 0, 256)
  grad.addColorStop(0, `#${top.toString(16).padStart(6, "0")}`)
  grad.addColorStop(1, `#${bottom.toString(16).padStart(6, "0")}`)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 2, 256)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  scene.background = texture
  return texture
}

/** Adds linear fog matched to a color (often the background). */
export function addFog(scene, color = BRAND.ink, near = 20, far = 120) {
  scene.fog = new THREE.Fog(color, near, far)
  return scene.fog
}

/** Exponential fog, better for large open scenes. */
export function addFogExp(scene, color = BRAND.ink, density = 0.02) {
  scene.fog = new THREE.FogExp2(color, density)
  return scene.fog
}

/**
 * A field of stars as a single Points cloud. Great cheap backdrop for space or
 * night scenes.
 */
export function addStarfield(scene, options = {}) {
  const { count = 1500, radius = 400, color = 0xffffff, size = 1.2 } = options
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    // Distribute on a sphere shell so stars surround the camera.
    const r = radius * (0.6 + Math.random() * 0.4)
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
    positions[i * 3 + 2] = r * Math.cos(phi)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3))
  const mat = new THREE.PointsMaterial({
    color,
    size,
    sizeAttenuation: true,
    depthWrite: false,
  })
  const points = new THREE.Points(geo, mat)
  scene.add(points)
  return points
}
