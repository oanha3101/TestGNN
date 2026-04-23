import { useEffect, useMemo, useRef, useState } from 'react'
import { Maximize2, Minus, Plus, Share2 } from 'lucide-react'
import Graph from 'graphology'
import forceAtlas2 from 'graphology-layout-forceatlas2'
import Sigma from 'sigma'
import { classColor, messagePassingPhases } from '../../data/mockGnn'
import { useGraphStore } from '../../store/useStore'
import type { ExplainerResult, GraphNode } from '../../types/gnn'

type GraphCanvasProps = {
  messageStep: number
  explanation: ExplainerResult | null
  explanationThreshold: number
  onCreateEdgeRequest: (source: string, target: string) => void
  canEdit: boolean
}

const buildLayout = (nodes: GraphNode[], layout: 'force' | 'circular' | 'hierarchical') => {
  if (layout === 'circular') {
    const total = Math.max(1, nodes.length)
    return new Map(
      nodes.map((node, index) => {
        const angle = (Math.PI * 2 * index) / total
        return [node.id, { x: Math.cos(angle) * 50, y: Math.sin(angle) * 46 }]
      }),
    )
  }

  if (layout === 'hierarchical') {
    const sorted = [...nodes].sort((a, b) => a.label - b.label || a.id.localeCompare(b.id))
    return new Map(
      sorted.map((node, index) => {
        const row = Math.floor(index / 4)
        const col = index % 4
        return [node.id, { x: -42 + col * 30, y: -34 + row * 26 }]
      }),
    )
  }

  return new Map(nodes.map((node) => [node.id, { x: node.x - 50, y: node.y - 40 }]))
}

export function GraphCanvas({
  messageStep,
  explanation,
  explanationThreshold,
  onCreateEdgeRequest,
  canEdit,
}: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const rendererRef = useRef<Sigma | null>(null)

  const nodes = useGraphStore((state) => state.nodes)
  const edges = useGraphStore((state) => state.edges)
  const selectedNodes = useGraphStore((state) => state.selectedNodes)
  const colorMode = useGraphStore((state) => state.colorMode)
  const attentionHead = useGraphStore((state) => state.attentionHead)
  const classFilter = useGraphStore((state) => state.classFilter)
  const showLabels = useGraphStore((state) => state.showLabels)
  const layoutAlgorithm = useGraphStore((state) => state.layoutAlgorithm)
  const setSelectedNodes = useGraphStore((state) => state.setSelectedNodes)
  const setHoveredNode = useGraphStore((state) => state.setHoveredNode)

  const selectedRef = useRef(selectedNodes)
  const [pendingEdgeSource, setPendingEdgeSource] = useState<string | null>(null)

  useEffect(() => {
    selectedRef.current = selectedNodes
  }, [selectedNodes])

  const phase = messagePassingPhases[messageStep]

  const explanationEdgeImportance = useMemo(() => {
    const map = new Map<string, number>()
    if (!explanation) return map
    for (const edge of explanation.importantEdges) {
      if (edge.importance >= explanationThreshold) {
        map.set(edge.edgeId, edge.importance)
      }
    }
    return map
  }, [explanation, explanationThreshold])

  useEffect(() => {
    if (!containerRef.current || nodes.length === 0) return

    const graph = new Graph()
    const positions = buildLayout(nodes, layoutAlgorithm)

    for (const node of nodes) {
      const pos = positions.get(node.id) ?? { x: 0, y: 0 }
      const isSelected = selectedRef.current.includes(node.id)
      const isHiddenByFilter = classFilter !== 'all' && node.label !== classFilter
      const isExplainedNode = explanation?.nodeId === node.id
      const phasePulse = messageStep > 1 && (node.id === 'v2' || node.id === 'v6')

      const baseSize = isSelected ? 12 : isExplainedNode ? 10 : phasePulse ? 9 : 7.5
      const color =
        colorMode === 'groundtruth'
          ? classColor(node.label)
          : colorMode === 'predicted'
            ? classColor(node.label)
            : '#ffffff'

      graph.addNode(node.id, {
        x: pos.x,
        y: pos.y,
        size: baseSize,
        color,
        label: showLabels ? node.id : '',
        hidden: isHiddenByFilter,
        borderColor: isSelected ? '#ffb287' : isExplainedNode ? '#c2ef4e' : 'transparent',
        type: isSelected || isExplainedNode ? 'circle' : 'circle',
      })
    }

    for (const edge of edges) {
      if (!graph.hasNode(edge.source) || !graph.hasNode(edge.target)) continue
      const attention = edge.attentionByHead[attentionHead]
      const isSelectedEdge = selectedRef.current.length > 0
        ? selectedRef.current.includes(edge.source) || selectedRef.current.includes(edge.target)
        : true
      const explanationImportance = explanationEdgeImportance.get(edge.id)
      const isExplainedEdge = explanationImportance !== undefined

      const sizeFromAttention = colorMode === 'attention' ? 0.8 + attention * 2.5 : 1.2
      const size = isExplainedEdge ? sizeFromAttention + explanationImportance * 2 : sizeFromAttention
      const color = isExplainedEdge
        ? `rgba(194, 239, 78, ${0.5 + explanationImportance * 0.5})`
        : isSelectedEdge
          ? `rgba(106, 95, 193, ${0.4 + attention * 0.6})`
          : 'rgba(54, 45, 89, 0.4)'

      graph.addEdgeWithKey(edge.id, edge.source, edge.target, {
        size,
        color,
      })
    }

    if (layoutAlgorithm === 'force') {
      forceAtlas2.assign(graph, {
        iterations: 120,
        settings: { gravity: 1.2, scalingRatio: 35, slowDown: 2.5 },
      })
    }

    const renderer = new Sigma(graph, containerRef.current, {
      renderEdgeLabels: false,
      labelDensity: 0.08,
      labelRenderedSizeThreshold: 10,
      labelFont: 'Rubik, sans-serif',
      labelColor: { color: '#ffffff' },
      defaultNodeColor: '#79628c',
      defaultEdgeColor: '#362d59',
      allowInvalidContainer: true,
    })

    renderer.on('clickNode', (payload) => {
      const nodeId = payload.node
      const mouseEvent = payload.event.original as MouseEvent

      if (!canEdit) {
        setPendingEdgeSource(null)
        setSelectedNodes([nodeId])
        return
      }

      if (mouseEvent.altKey) {
        if (pendingEdgeSource && pendingEdgeSource !== nodeId) {
          onCreateEdgeRequest(pendingEdgeSource, nodeId)
          setPendingEdgeSource(null)
          setSelectedNodes([pendingEdgeSource, nodeId])
          return
        }
        setPendingEdgeSource(nodeId)
        setSelectedNodes([nodeId])
        return
      }

      if (mouseEvent.shiftKey) {
        const current = selectedRef.current
        const next = current.includes(nodeId)
          ? current.filter((id) => id !== nodeId)
          : [...current, nodeId]
        setSelectedNodes(next)
        return
      }

      setPendingEdgeSource(null)
      setSelectedNodes([nodeId])
    })

    renderer.on('clickStage', () => {
      setPendingEdgeSource(null)
    })

    renderer.on('enterNode', ({ node }) => {
      setHoveredNode(node)
    })
    renderer.on('leaveNode', () => {
      setHoveredNode(null)
    })

    rendererRef.current = renderer

    return () => {
      renderer.kill()
      rendererRef.current = null
    }
  }, [
    attentionHead,
    classFilter,
    colorMode,
    edges,
    explanation,
    explanationEdgeImportance,
    layoutAlgorithm,
    messageStep,
    nodes,
    onCreateEdgeRequest,
    pendingEdgeSource,
    setHoveredNode,
    setSelectedNodes,
    showLabels,
    canEdit,
  ])

  const zoomIn = () => {
    const camera = rendererRef.current?.getCamera()
    if (!camera) return
    camera.animate({ ratio: camera.ratio / 1.3 }, { duration: 200 })
  }

  const zoomOut = () => {
    const camera = rendererRef.current?.getCamera()
    if (!camera) return
    camera.animate({ ratio: camera.ratio * 1.3 }, { duration: 200 })
  }

  const fitGraph = () => {
    const camera = rendererRef.current?.getCamera()
    if (!camera) return
    camera.animatedReset()
  }

  return (
    <section className="canvas-card border-sentry-purple-border/40 relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-sentry-purple-darker/20 to-transparent pointer-events-none" />
      
      <div className="canvas-head relative z-10">
        <div className="flex items-center gap-2">
          <Share2 size={16} className="text-sentry-lime" />
          <h2 className="font-display font-bold uppercase tracking-tight text-lg">Neural Canvas</h2>
        </div>
        <span className="font-mono text-[10px] bg-sentry-purple-violet/60 px-2 py-1 rounded border border-sentry-purple-border/50 uppercase tracking-widest text-sentry-lime">
          {phase}
        </span>
      </div>

      <div className="canvas-wrap mt-4 bg-sentry-purple-darker/80 border border-sentry-purple-border/30 shadow-inner">
        <div ref={containerRef} className="sigma-container opacity-90 hover:opacity-100 transition-opacity" />
      </div>

      <div className="canvas-toolbar absolute bottom-6 right-6 flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <button type="button" className="w-10 h-10 bg-sentry-purple-muted/80 hover:bg-sentry-purple border border-sentry-purple-border rounded-lg shadow-xl backdrop-blur-md flex items-center justify-center transition-all" aria-label="Zoom in" onClick={zoomIn}>
          <Plus size={18} />
        </button>
        <button type="button" className="w-10 h-10 bg-sentry-purple-muted/80 hover:bg-sentry-purple border border-sentry-purple-border rounded-lg shadow-xl backdrop-blur-md flex items-center justify-center transition-all" aria-label="Zoom out" onClick={zoomOut}>
          <Minus size={18} />
        </button>
        <button type="button" className="w-10 h-10 bg-sentry-purple-muted/80 hover:bg-sentry-purple border border-sentry-purple-border rounded-lg shadow-xl backdrop-blur-md flex items-center justify-center transition-all" aria-label="Fit graph" onClick={fitGraph}>
          <Maximize2 size={18} />
        </button>
      </div>

      <p className="canvas-hint mt-4 text-[10px] font-bold uppercase tracking-wider opacity-60 text-center">
        {canEdit
          ? 'Shift+click: multi-select • Alt+click 2 nodes: create edge'
          : 'Locked in temporal mode'}
        {pendingEdgeSource ? <span className="text-sentry-coral ml-2 animate-pulse">Connecting from {pendingEdgeSource}...</span> : ''}
      </p>
    </section>
  )
}
