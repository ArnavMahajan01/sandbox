/**
 * Audio — a zero-asset sound engine built on the Web Audio API. It can
 * synthesize common game SFX procedurally (so games need no audio files), loop
 * background music, and also load/play external samples from a URL.
 *
 * Browsers block audio until a user gesture, so call `audio.resume()` from a
 * click/keydown (e.g. the Play button) before expecting sound.
 *
 *   const audio = new AudioEngine()
 *   startButton.onclick = () => { audio.resume(); game.start() }
 *   audio.sfx("coin")
 *   audio.sfx("explosion")
 *   audio.tone({ freq: 440, duration: 0.2, type: "square" })
 */
export class AudioEngine {
  constructor() {
    const Ctx = window.AudioContext || window.webkitAudioContext
    this.ctx = new Ctx()
    this.master = this.ctx.createGain()
    this.master.gain.value = 0.8
    this.master.connect(this.ctx.destination)
    this._samples = new Map()
    this._music = null
  }

  /** Resume the audio context. Call from a user gesture handler. */
  async resume() {
    if (this.ctx.state === "suspended") await this.ctx.resume()
    return this
  }

  set volume(v) {
    this.master.gain.value = v
  }

  get volume() {
    return this.master.gain.value
  }

  /**
   * Play a simple oscillator tone with an ADSR-ish envelope. The building block
   * for every procedural sound.
   */
  tone(options = {}) {
    const {
      freq = 440,
      type = "sine",
      duration = 0.2,
      volume = 0.4,
      attack = 0.005,
      decay = duration,
      sweepTo = null, // slide the pitch to this freq over the duration
      when = 0,
    } = options
    const now = this.ctx.currentTime + when
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, now)
    if (sweepTo != null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, sweepTo), now + duration)
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(volume, now + attack)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + attack + decay)
    osc.connect(gain).connect(this.master)
    osc.start(now)
    osc.stop(now + attack + decay + 0.02)
  }

  /** A short filtered-noise burst — the basis for explosions, hits, whooshes. */
  noise(options = {}) {
    const { duration = 0.3, volume = 0.4, type = "lowpass", frequency = 1000, when = 0 } = options
    const now = this.ctx.currentTime + when
    const length = Math.floor(this.ctx.sampleRate * duration)
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
    const src = this.ctx.createBufferSource()
    src.buffer = buffer
    const filter = this.ctx.createBiquadFilter()
    filter.type = type
    filter.frequency.value = frequency
    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(volume, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    src.connect(filter).connect(gain).connect(this.master)
    src.start(now)
    src.stop(now + duration)
  }

  /**
   * Named, ready-to-use game sounds synthesized on the fly. Extend freely.
   *   coin, jump, hit, explosion, powerup, laser, click, error, success
   */
  sfx(name) {
    switch (name) {
      case "coin":
        this.tone({ freq: 988, type: "square", duration: 0.08, volume: 0.25 })
        this.tone({ freq: 1319, type: "square", duration: 0.12, volume: 0.25, when: 0.08 })
        break
      case "jump":
        this.tone({ freq: 320, type: "square", duration: 0.18, volume: 0.3, sweepTo: 720 })
        break
      case "hit":
        this.tone({ freq: 180, type: "sawtooth", duration: 0.12, volume: 0.35, sweepTo: 60 })
        this.noise({ duration: 0.1, volume: 0.2, frequency: 800 })
        break
      case "explosion":
        this.noise({ duration: 0.6, volume: 0.5, frequency: 500, type: "lowpass" })
        this.tone({ freq: 90, type: "sawtooth", duration: 0.5, volume: 0.3, sweepTo: 30 })
        break
      case "powerup":
        this.tone({ freq: 523, type: "triangle", duration: 0.1, volume: 0.3 })
        this.tone({ freq: 659, type: "triangle", duration: 0.1, volume: 0.3, when: 0.1 })
        this.tone({ freq: 784, type: "triangle", duration: 0.16, volume: 0.3, when: 0.2 })
        break
      case "laser":
        this.tone({ freq: 1200, type: "sawtooth", duration: 0.2, volume: 0.25, sweepTo: 200 })
        break
      case "click":
        this.tone({ freq: 660, type: "square", duration: 0.04, volume: 0.2 })
        break
      case "error":
        this.tone({ freq: 200, type: "square", duration: 0.2, volume: 0.3, sweepTo: 120 })
        break
      case "success":
        this.tone({ freq: 523, type: "sine", duration: 0.12, volume: 0.3 })
        this.tone({ freq: 784, type: "sine", duration: 0.2, volume: 0.3, when: 0.12 })
        break
      default:
        this.tone({ freq: 440, duration: 0.1, volume: 0.2 })
    }
  }

  /** Load an external audio sample (public CDN URL) for later playback. */
  async load(name, url) {
    const res = await fetch(url)
    const arrayBuffer = await res.arrayBuffer()
    const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer)
    this._samples.set(name, audioBuffer)
    return audioBuffer
  }

  /** Play a previously loaded sample. */
  play(name, { volume = 1, rate = 1, loop = false } = {}) {
    const buffer = this._samples.get(name)
    if (!buffer) return null
    const src = this.ctx.createBufferSource()
    src.buffer = buffer
    src.playbackRate.value = rate
    src.loop = loop
    const gain = this.ctx.createGain()
    gain.gain.value = volume
    src.connect(gain).connect(this.master)
    src.start()
    return src
  }

  /**
   * Loop a procedural chiptune from an array of note frequencies (or a loaded
   * sample name). Simple but gives games music without any files.
   *
   *   audio.music({ notes: [262, 330, 392, 330], tempo: 2, volume: 0.15 })
   */
  music(options = {}) {
    this.stopMusic()
    if (options.sample) {
      this._music = { source: this.play(options.sample, { loop: true, volume: options.volume ?? 0.3 }) }
      return
    }
    const notes = options.notes ?? [262, 330, 392, 523]
    const tempo = options.tempo ?? 2 // notes per second
    const volume = options.volume ?? 0.12
    const type = options.type ?? "triangle"
    let i = 0
    const interval = setInterval(() => {
      this.tone({ freq: notes[i % notes.length], type, duration: 1 / tempo, volume })
      i++
    }, 1000 / tempo)
    this._music = { interval }
  }

  stopMusic() {
    if (!this._music) return
    if (this._music.interval) clearInterval(this._music.interval)
    if (this._music.source) {
      try {
        this._music.source.stop()
      } catch {
        /* already stopped */
      }
    }
    this._music = null
  }

  dispose() {
    this.stopMusic()
    this.ctx.close()
  }
}
