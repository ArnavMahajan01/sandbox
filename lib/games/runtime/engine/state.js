/**
 * State — gameplay glue: an event emitter, a finite state machine for game
 * phases (menu/playing/paused/gameover), a tiny reactive store for score/lives,
 * localStorage save helpers, cooldown timers, and an object spawner/pool.
 */

/** Minimal event emitter. */
export class Emitter {
  constructor() {
    this._listeners = new Map()
  }

  on(event, fn) {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set())
    this._listeners.get(event).add(fn)
    return () => this.off(event, fn)
  }

  once(event, fn) {
    const off = this.on(event, (...args) => {
      off()
      fn(...args)
    })
    return off
  }

  off(event, fn) {
    this._listeners.get(event)?.delete(fn)
  }

  emit(event, ...args) {
    this._listeners.get(event)?.forEach((fn) => fn(...args))
  }
}

/**
 * StateMachine — model discrete game phases with enter/exit/update hooks.
 *
 *   const fsm = new StateMachine({
 *     menu: { enter: () => menu.show(), exit: () => menu.hide() },
 *     playing: { update: (dt) => world.step(dt) },
 *     gameover: { enter: () => showGameOver() },
 *   }, "menu")
 *   fsm.set("playing")
 *   engine.onUpdate((dt) => fsm.update(dt))
 */
export class StateMachine extends Emitter {
  constructor(states = {}, initial = null) {
    super()
    this.states = states
    this.current = null
    this.previous = null
    if (initial) this.set(initial)
  }

  set(name, ...args) {
    if (name === this.current) return
    this.states[this.current]?.exit?.(...args)
    this.previous = this.current
    this.current = name
    this.states[name]?.enter?.(...args)
    this.emit("change", name, this.previous)
  }

  is(name) {
    return this.current === name
  }

  update(dt) {
    this.states[this.current]?.update?.(dt)
  }
}

/**
 * Store — a small reactive key/value bag. Subscribe to individual keys to keep
 * HUD elements in sync automatically.
 *
 *   const store = new Store({ score: 0, lives: 3 })
 *   store.subscribe("score", (v) => scoreText.set(`Score: ${v}`))
 *   store.set("score", store.get("score") + 10)
 *   store.add("score", 10) // shorthand for numeric increments
 */
export class Store {
  constructor(initial = {}) {
    this._state = { ...initial }
    this._subs = new Map()
  }

  get(key) {
    return this._state[key]
  }

  set(key, value) {
    const prev = this._state[key]
    if (prev === value) return value
    this._state[key] = value
    this._subs.get(key)?.forEach((fn) => fn(value, prev))
    return value
  }

  add(key, delta) {
    return this.set(key, (this._state[key] ?? 0) + delta)
  }

  subscribe(key, fn, { immediate = true } = {}) {
    if (!this._subs.has(key)) this._subs.set(key, new Set())
    this._subs.get(key).add(fn)
    if (immediate) fn(this._state[key], undefined)
    return () => this._subs.get(key)?.delete(fn)
  }

  snapshot() {
    return { ...this._state }
  }
}

/** Persist small JSON blobs (high scores, settings) to localStorage safely. */
export const Save = {
  load(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) : fallback
    } catch {
      return fallback
    }
  },
  save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value))
      return true
    } catch {
      return false
    }
  },
  /** Update a high score, returning true when a new record was set. */
  highScore(key, score) {
    const best = this.load(key, 0)
    if (score > best) {
      this.save(key, score)
      return true
    }
    return false
  },
}

/**
 * Timer — a countdown/cooldown you tick each frame. Fires a callback when it
 * reaches zero; optionally auto-repeats (great for spawn cadences).
 *
 *   const spawnTimer = new Timer(1.5, () => spawnEnemy(), { repeat: true })
 *   engine.onUpdate((dt) => spawnTimer.update(dt))
 */
export class Timer {
  constructor(duration, onComplete, options = {}) {
    this.duration = duration
    this.remaining = duration
    this.onComplete = onComplete
    this.repeat = options.repeat ?? false
    this.running = options.autoStart ?? true
  }

  reset(duration = this.duration) {
    this.remaining = duration
    this.running = true
  }

  stop() {
    this.running = false
  }

  /** True on the frame it completes; also invokes onComplete. */
  update(dt) {
    if (!this.running) return false
    this.remaining -= dt
    if (this.remaining <= 0) {
      this.onComplete?.()
      if (this.repeat) this.remaining += this.duration
      else this.running = false
      return true
    }
    return false
  }

  get progress() {
    return 1 - Math.max(0, this.remaining) / this.duration
  }
}

/**
 * Pool — object pool to avoid GC churn from constantly creating/destroying
 * bullets, enemies, particles, etc.
 *
 *   const bullets = new Pool(() => makeBullet(), (b) => (b.visible = false))
 *   const b = bullets.acquire()
 *   bullets.release(b)
 */
export class Pool {
  constructor(factory, reset = null, initial = 0) {
    this.factory = factory
    this.reset = reset
    this._free = []
    this._active = new Set()
    for (let i = 0; i < initial; i++) this._free.push(factory())
  }

  acquire() {
    const obj = this._free.pop() ?? this.factory()
    this._active.add(obj)
    return obj
  }

  release(obj) {
    if (!this._active.delete(obj)) return
    this.reset?.(obj)
    this._free.push(obj)
  }

  get active() {
    return this._active
  }

  forEachActive(fn) {
    this._active.forEach(fn)
  }
}
