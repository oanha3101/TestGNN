import { Sparkles } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts'
import * as THREE from 'three'
import { useTrainingEmbeddingsQuery } from '../../api/hooks'
import { useGraphStore, useModelStore } from '../../store/useStore'
import { buildProjection } from '../../utils/projection'

export function EmbeddingViewer() {
  const nodes = useGraphStore((state) => state.nodes)
  const projection = useGraphStore((state) => state.selectedProjection)
  const lastCompletedRunId = useModelStore((state) => state.lastCompletedRunId)
  const embeddingsQuery = useTrainingEmbeddingsQuery(lastCompletedRunId)

  // Prefer the real PCA projection produced by the ML engine after training
  // finishes; fall back to the client-side PCA/t-SNE/UMAP projection derived
  // from the mock graph features so the viewer still has content before the
  // first run completes.
  const projectionData = useMemo(() => {
    const remote = embeddingsQuery.data
    if (remote) {
      return remote.embedding_2d.map(([x, y], index) => ({
        id: `n${index}`,
        x: Number((x * 40).toFixed(3)),
        y: Number((y * 40).toFixed(3)),
        label: remote.predictions[index] ?? 0,
      }))
    }
    return buildProjection(nodes, projection)
  }, [embeddingsQuery.data, nodes, projection])

  const isRealEmbedding = Boolean(embeddingsQuery.data)

  const [mode, setMode] = useState<'2d' | '3d'>('2d')
  const canvasRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (mode !== '3d' || !canvasRef.current) return

    const container = canvasRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('rgba(0,0,0,0)')

    const camera = new THREE.PerspectiveCamera(52, width / Math.max(1, height), 0.1, 1000)
    camera.position.set(0, 0, 125)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(width, height)
    container.appendChild(renderer.domElement)

    const group = new THREE.Group()
    scene.add(group)

    const geometry = new THREE.SphereGeometry(1.7, 10, 10)
    const points: THREE.Mesh[] = []

    projectionData.forEach((point) => {
      const material = new THREE.MeshBasicMaterial({
        color:
          point.label === 0
            ? '#2ed0b7'
            : point.label === 1
              ? '#5aa9ff'
              : point.label === 2
                ? '#ff8f6b'
                : '#ffd166',
      })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(point.x - 50, point.y - 50, (point.label - 1.5) * 15)
      group.add(mesh)
      points.push(mesh)
    })

    const ambient = new THREE.AmbientLight(0xffffff, 1)
    scene.add(ambient)

    let rafId = 0
    const animate = () => {
      group.rotation.y += 0.004
      group.rotation.x += 0.0015
      renderer.render(scene, camera)
      rafId = window.requestAnimationFrame(animate)
    }
    animate()

    return () => {
      window.cancelAnimationFrame(rafId)
      points.forEach((mesh) => {
        mesh.geometry.dispose()
        const material = mesh.material as THREE.Material
        material.dispose()
      })
      renderer.dispose()
      scene.clear()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [mode, projectionData])

  return (
    <section className="embedding-card">
      <div className="dashboard-head">
        <h3>
          <Sparkles size={16} />
          Embedding Viewer
        </h3>
        <span>
          {isRealEmbedding
            ? `Run #${lastCompletedRunId} · PCA (real)`
            : `${projection.toUpperCase()} projection`}
        </span>
      </div>

      <div className="embed-mode">
        <button
          type="button"
          className={mode === '2d' ? 'chip chip-active' : 'chip'}
          onClick={() => setMode('2d')}
        >
          2D
        </button>
        <button
          type="button"
          className={mode === '3d' ? 'chip chip-active' : 'chip'}
          onClick={() => setMode('3d')}
        >
          3D (Three.js)
        </button>
      </div>

      {mode === '2d' ? (
        <ResponsiveContainer width="100%" height={210}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 4" stroke="#243047" />
            <XAxis type="number" dataKey="x" stroke="#8ea0bf" tickLine={false} axisLine={false} />
            <YAxis type="number" dataKey="y" stroke="#8ea0bf" tickLine={false} axisLine={false} />
            <Tooltip cursor={{ strokeDasharray: '4 4' }} />
            <Scatter data={projectionData} fill="#5aa9ff" />
          </ScatterChart>
        </ResponsiveContainer>
      ) : (
        <div ref={canvasRef} className="embedding-canvas3d" />
      )}
    </section>
  )
}
