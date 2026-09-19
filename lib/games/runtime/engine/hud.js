import { brandCss, BRAND } from "./brand.js"

/**
 * HUD — DOM-based heads-up display and menus. Rendering UI with the DOM (instead
 * of in-canvas) keeps text crisp, accessible, and easy to style. Everything is
 * injected into a fixed overlay layered above the canvas.
 *
 *   const hud = new HUD()
 *   const score = hud.addText({ top: 16, left: 16, text: "Score: 0" })
 *   score.set("Score: 10")
 *   const hp = hud.addBar({ top: 16, right: 16, value: 1, color: 0xea580c })
 *   hud.toast("Level up!")
 */
export class HUD {
  constructor(options = {}) {
    const parent = options.parent ?? document.body
    const root = document.createElement("div")
    Object.assign(root.style, {
      position: "fixed",
      inset: "0",
      pointerEvents: "none",
      zIndex: "20",
      fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      color: "#fff7ed",
      userSelect: "none",
    })
    parent.appendChild(root)
    this.root = root
    this._injectKeyframes()
  }

  _injectKeyframes() {
    if (document.getElementById("engine-hud-anim")) return
    const style = document.createElement("style")
    style.id = "engine-hud-anim"
    style.textContent = `
      @keyframes hud-toast-in { from { opacity: 0; transform: translate(-50%, -12px); } to { opacity: 1; transform: translate(-50%, 0); } }
      @keyframes hud-pop { 0% { transform: scale(0.6); opacity: 0; } 60% { transform: scale(1.08); } 100% { transform: scale(1); opacity: 1; } }
    `
    document.head.appendChild(style)
  }

  _place(el, pos) {
    Object.assign(el.style, { position: "absolute" })
    for (const side of ["top", "right", "bottom", "left"]) {
      if (pos[side] != null) el.style[side] = typeof pos[side] === "number" ? `${pos[side]}px` : pos[side]
    }
    if (pos.center) {
      el.style.left = "50%"
      el.style.transform = "translateX(-50%)"
    }
  }

  /** A text readout (score, timer, lives). Returns a handle with set()/remove(). */
  addText(options = {}) {
    const el = document.createElement("div")
    el.textContent = options.text ?? ""
    Object.assign(el.style, {
      fontSize: `${options.size ?? 20}px`,
      fontWeight: "700",
      letterSpacing: "0.01em",
      textShadow: "0 2px 8px rgba(0,0,0,0.6)",
      color: options.color ? brandCss(options.color) : "#fff7ed",
    })
    this._place(el, options)
    this.root.appendChild(el)
    return {
      el,
      set: (text) => (el.textContent = text),
      color: (c) => (el.style.color = brandCss(c)),
      remove: () => el.remove(),
    }
  }

  /** A horizontal bar (health, energy, progress). value is 0..1. */
  addBar(options = {}) {
    const width = options.width ?? 220
    const height = options.height ?? 16
    const wrap = document.createElement("div")
    Object.assign(wrap.style, {
      width: `${width}px`,
      height: `${height}px`,
      borderRadius: `${height}px`,
      background: "rgba(0,0,0,0.45)",
      border: "1px solid rgba(255,255,255,0.15)",
      overflow: "hidden",
      boxShadow: "0 2px 10px rgba(0,0,0,0.4)",
    })
    const fill = document.createElement("div")
    Object.assign(fill.style, {
      height: "100%",
      width: `${(options.value ?? 1) * 100}%`,
      background: brandCss(options.color ?? BRAND.orange),
      transition: "width 0.15s ease-out",
    })
    wrap.appendChild(fill)
    this._place(wrap, options)
    this.root.appendChild(wrap)
    return {
      el: wrap,
      set: (value) => (fill.style.width = `${Math.max(0, Math.min(1, value)) * 100}%`),
      color: (c) => (fill.style.background = brandCss(c)),
      remove: () => wrap.remove(),
    }
  }

  /** A center-screen crosshair for shooters. */
  addCrosshair(options = {}) {
    const el = document.createElement("div")
    const size = options.size ?? 22
    Object.assign(el.style, {
      position: "absolute",
      top: "50%",
      left: "50%",
      width: `${size}px`,
      height: `${size}px`,
      transform: "translate(-50%, -50%)",
      border: `2px solid ${brandCss(options.color ?? BRAND.cream)}`,
      borderRadius: "50%",
      opacity: "0.8",
      boxShadow: "0 0 6px rgba(0,0,0,0.6)",
    })
    this.root.appendChild(el)
    return { el, remove: () => el.remove() }
  }

  /** A transient toast/message that fades out. */
  toast(text, options = {}) {
    const el = document.createElement("div")
    el.textContent = text
    Object.assign(el.style, {
      position: "absolute",
      top: options.top != null ? `${options.top}px` : "18%",
      left: "50%",
      transform: "translateX(-50%)",
      padding: "10px 18px",
      borderRadius: "999px",
      background: "rgba(11,11,15,0.72)",
      border: "1px solid rgba(255,255,255,0.12)",
      fontSize: `${options.size ?? 18}px`,
      fontWeight: "600",
      animation: "hud-toast-in 0.2s ease-out",
      whiteSpace: "nowrap",
    })
    this.root.appendChild(el)
    const duration = options.duration ?? 1600
    setTimeout(() => {
      el.style.transition = "opacity 0.4s"
      el.style.opacity = "0"
      setTimeout(() => el.remove(), 420)
    }, duration)
    return el
  }

  clear() {
    this.root.innerHTML = ""
  }

  dispose() {
    this.root.remove()
  }
}

/**
 * Menu — a full-screen overlay panel with a title, subtitle, and buttons. Use it
 * for start screens, pause menus, and game-over screens. Buttons re-enable
 * pointer events so they're clickable above the canvas.
 *
 *   const menu = new Menu({
 *     title: "MY GAME",
 *     subtitle: "Reach the exit",
 *     buttons: [{ label: "Play", onClick: () => start() }],
 *   })
 *   menu.show()
 *   // later: menu.hide()
 */
export class Menu {
  constructor(options = {}) {
    const parent = options.parent ?? document.body
    const overlay = document.createElement("div")
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      display: "none",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      gap: "18px",
      background: options.dim ?? "radial-gradient(circle at 50% 30%, rgba(234,88,12,0.12), rgba(11,11,15,0.86))",
      backdropFilter: "blur(4px)",
      zIndex: "40",
      textAlign: "center",
      fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      color: "#fff7ed",
      padding: "24px",
    })

    if (options.title) {
      const h = document.createElement("h1")
      h.textContent = options.title
      Object.assign(h.style, {
        margin: "0",
        fontSize: "clamp(2.4rem, 8vw, 4.5rem)",
        fontWeight: "800",
        letterSpacing: "-0.03em",
        background: `linear-gradient(120deg, ${brandCss(BRAND.amber)}, ${brandCss(BRAND.orange)}, ${brandCss(BRAND.violet)})`,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
        animation: "hud-pop 0.4s ease-out",
      })
      overlay.appendChild(h)
      this.titleEl = h
    }

    if (options.subtitle) {
      const p = document.createElement("p")
      p.textContent = options.subtitle
      Object.assign(p.style, {
        margin: "0",
        fontSize: "clamp(1rem, 3vw, 1.25rem)",
        color: "rgba(255,247,237,0.75)",
        maxWidth: "40ch",
      })
      overlay.appendChild(p)
      this.subtitleEl = p
    }

    const row = document.createElement("div")
    Object.assign(row.style, { display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center", marginTop: "8px" })
    for (const btn of options.buttons ?? []) {
      row.appendChild(this._button(btn))
    }
    overlay.appendChild(row)
    this.buttonsRow = row

    parent.appendChild(overlay)
    this.overlay = overlay
  }

  _button({ label, onClick, primary = true }) {
    const b = document.createElement("button")
    b.textContent = label
    Object.assign(b.style, {
      pointerEvents: "auto",
      cursor: "pointer",
      padding: "12px 28px",
      fontSize: "1.05rem",
      fontWeight: "700",
      borderRadius: "12px",
      border: primary ? "none" : "1px solid rgba(255,255,255,0.25)",
      color: primary ? "#1a0f08" : "#fff7ed",
      background: primary ? `linear-gradient(120deg, ${brandCss(BRAND.amber)}, ${brandCss(BRAND.orange)})` : "rgba(255,255,255,0.06)",
      boxShadow: primary ? "0 8px 24px rgba(234,88,12,0.4)" : "none",
      transition: "transform 0.08s ease, filter 0.15s ease",
    })
    b.onmouseenter = () => (b.style.filter = "brightness(1.08)")
    b.onmouseleave = () => (b.style.filter = "none")
    b.onmousedown = () => (b.style.transform = "scale(0.96)")
    b.onmouseup = () => (b.style.transform = "scale(1)")
    b.onclick = () => onClick?.()
    return b
  }

  setTitle(text) {
    if (this.titleEl) this.titleEl.textContent = text
  }

  setSubtitle(text) {
    if (this.subtitleEl) this.subtitleEl.textContent = text
  }

  show() {
    this.overlay.style.display = "flex"
    return this
  }

  hide() {
    this.overlay.style.display = "none"
    return this
  }

  get visible() {
    return this.overlay.style.display !== "none"
  }

  dispose() {
    this.overlay.remove()
  }
}
