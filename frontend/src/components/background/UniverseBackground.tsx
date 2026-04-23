import { useEffect, useRef } from 'react'

type Node = {
  x: number
  y: number
  vx: number
  vy: number
  r: number
}

const DENSITY = 0.00012 // nodes per pixel²
const MAX_NODES = 110
const MIN_NODES = 40
const LINK_DISTANCE = 150
const LINK_DISTANCE_SQ = LINK_DISTANCE * LINK_DISTANCE
const SPEED = 0.22

/** Full-screen animated graph network background.
 *
 * Drawn to a fixed, pointer-events-none canvas behind the app shell.
 * Colors pull from the active theme via ``getComputedStyle`` on the
 * root element, so the background re-tints when the user toggles
 * light/dark (observed through a MutationObserver on ``data-theme``).
 *
 * Respects ``prefers-reduced-motion`` — renders a single static frame
 * then stops animating.
 *
 * Auto-pauses when the tab is hidden to keep CPU use near zero.
 */
export function UniverseBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const state = {
      width: 0,
      height: 0,
      nodes: [] as Node[],
      running: true,
      frame: 0,
      dot: 'rgba(146, 134, 255, 0.55)',
      edge: 'rgba(146, 134, 255, 0.16)',
      lowMotion: false,
    }

    const readThemeColors = () => {
      const styles = getComputedStyle(document.documentElement)
      const dot = styles.getPropertyValue('--bg-particle').trim() || 'rgba(146, 134, 255, 0.55)'
      const edge = styles.getPropertyValue('--bg-particle-edge').trim() || 'rgba(146, 134, 255, 0.16)'
      state.dot = dot
      state.edge = edge
    }

    const resize = () => {
      const { innerWidth: w, innerHeight: h } = window
      state.width = w
      state.height = h
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const target = Math.min(MAX_NODES, Math.max(MIN_NODES, Math.round(w * h * DENSITY)))
      if (state.nodes.length < target) {
        for (let i = state.nodes.length; i < target; i++) {
          state.nodes.push(spawn(w, h))
        }
      } else if (state.nodes.length > target) {
        state.nodes.length = target
      }
    }

    const spawn = (w: number, h: number): Node => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * SPEED,
      vy: (Math.random() - 0.5) * SPEED,
      r: 1 + Math.random() * 2,
    })

    const step = () => {
      const { width, height, nodes } = state
      ctx.clearRect(0, 0, width, height)

      for (const n of nodes) {
        if (!state.lowMotion) {
          n.x += n.vx
          n.y += n.vy
          if (n.x < -20) n.x = width + 20
          if (n.x > width + 20) n.x = -20
          if (n.y < -20) n.y = height + 20
          if (n.y > height + 20) n.y = -20
        }
      }

      // Edges (linear pass, O(n²) — n ≤ 110 so this is fine at 60fps).
      ctx.lineWidth = 1
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i]
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const dsq = dx * dx + dy * dy
          if (dsq > LINK_DISTANCE_SQ) continue
          const alpha = 1 - dsq / LINK_DISTANCE_SQ
          ctx.strokeStyle = tintWithAlpha(state.edge, alpha)
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
        }
      }

      // Nodes on top.
      ctx.fillStyle = state.dot
      for (const n of nodes) {
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.fill()
      }

      if (state.running) {
        state.frame = window.requestAnimationFrame(step)
      }
    }

    const start = () => {
      if (!state.running) {
        state.running = true
        state.frame = window.requestAnimationFrame(step)
      }
    }

    const stop = () => {
      state.running = false
      window.cancelAnimationFrame(state.frame)
    }

    const onVisibility = () => {
      if (document.hidden) stop()
      else start()
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onReducedMotion = () => {
      state.lowMotion = reducedMotion.matches
    }
    onReducedMotion()
    reducedMotion.addEventListener?.('change', onReducedMotion)

    // Re-read theme colors when ``data-theme`` flips.
    const themeObserver = new MutationObserver(() => readThemeColors())
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })

    readThemeColors()
    resize()
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', onVisibility)
    state.frame = window.requestAnimationFrame(step)

    return () => {
      stop()
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
      reducedMotion.removeEventListener?.('change', onReducedMotion)
      themeObserver.disconnect()
    }
  }, [])

  return <canvas ref={canvasRef} className="universe-background" aria-hidden="true" />
}

/** Multiply a CSS color string's alpha by ``factor``. Handles
 * ``rgba(...)``, ``rgb(...)``, and 6-digit hex. Falls back to the
 * original string when the format isn't understood. */
function tintWithAlpha(color: string, factor: number): string {
  const rgbaMatch = color.match(/rgba?\(([^)]+)\)/)
  if (rgbaMatch) {
    const parts = rgbaMatch[1].split(',').map((s) => s.trim())
    const [r, g, b] = parts
    const a = parts[3] !== undefined ? Number(parts[3]) : 1
    return `rgba(${r}, ${g}, ${b}, ${(a * factor).toFixed(3)})`
  }
  if (color.startsWith('#') && color.length === 7) {
    const r = parseInt(color.slice(1, 3), 16)
    const g = parseInt(color.slice(3, 5), 16)
    const b = parseInt(color.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${factor.toFixed(3)})`
  }
  return color
}
