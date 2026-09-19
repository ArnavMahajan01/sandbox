/**
 * PostFX — optional post-processing. Loaded on demand because it pulls extra
 * addon modules from the CDN. The most impactful effect for stylized games is
 * bloom (glowing highlights), so there's a one-liner for it.
 *
 *   const bloom = await addBloom(engine, { strength: 0.8 })
 *   // engine.composer is now set and used automatically by the render loop.
 */
export async function createComposer(engine) {
  const { EffectComposer } = await import("three/addons/postprocessing/EffectComposer.js")
  const { RenderPass } = await import("three/addons/postprocessing/RenderPass.js")
  const composer = new EffectComposer(engine.renderer)
  composer.addPass(new RenderPass(engine.scene, engine.camera))
  engine.composer = composer
  engine.track(composer)
  const { width, height } = engine._size()
  composer.setSize(width, height)
  return composer
}

export async function addBloom(engine, options = {}) {
  const [{ UnrealBloomPass }, { Vector2 }] = await Promise.all([
    import("three/addons/postprocessing/UnrealBloomPass.js"),
    import("three"),
  ])
  const composer = engine.composer ?? (await createComposer(engine))
  const { width, height } = engine._size()
  const bloom = new UnrealBloomPass(
    new Vector2(width, height),
    options.strength ?? 0.7,
    options.radius ?? 0.4,
    options.threshold ?? 0.85
  )
  composer.addPass(bloom)
  return bloom
}

/** Vignette + subtle chromatic feel via the built-in output/After passes. */
export async function addOutputPass(engine) {
  const { OutputPass } = await import("three/addons/postprocessing/OutputPass.js")
  const composer = engine.composer ?? (await createComposer(engine))
  const pass = new OutputPass()
  composer.addPass(pass)
  return pass
}
