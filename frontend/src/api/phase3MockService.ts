import type {
  ArchitectureLayer,
  ArchitectureLayerType,
  ArchitectureSchema,
  GraphEdge,
  GraphNode,
  GraphTransformerConfig,
  ModelType,
  TemporalSnapshot,
} from '../types/gnn'

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const pairHash = (a: string, b: string) => {
  const key = `${a}:${b}`
  let hash = 0
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) % 997
  }
  return hash
}

const withUpdatedDegree = (nodes: GraphNode[], edges: GraphEdge[]) => {
  const degreeMap = new Map(nodes.map((node) => [node.id, 0]))
  for (const edge of edges) {
    degreeMap.set(edge.source, (degreeMap.get(edge.source) ?? 0) + 1)
    degreeMap.set(edge.target, (degreeMap.get(edge.target) ?? 0) + 1)
  }
  return nodes.map((node) => ({ ...node, degree: degreeMap.get(node.id) ?? 0 }))
}

const dynamicStepLabel = (step: number) => {
  if (step === 0) return 'Warmup'
  if (step === 2) return 'Community Burst'
  if (step === 4) return 'Concept Drift'
  if (step === 6) return 'Link Recovery'
  if (step === 8) return 'Stabilization'
  return `Snapshot T+${step}`
}

const blendAttention = (attentionByHead: number[], step: number) => {
  return attentionByHead.map((value, index) => {
    const wave = Math.sin((step + 1) * 0.9 + index * 0.7) * 0.08
    return Number(clamp(value + wave, 0.04, 0.99).toFixed(3))
  })
}

const generateDynamicEdges = (nodes: GraphNode[], edges: GraphEdge[], step: number) => {
  const activeEdges = edges.filter((edge) => {
    const hash = pairHash(edge.source, edge.target)
    return ((hash + step * 5) % 11) > 1
  })
  const base = activeEdges.map((edge) => ({
    ...edge,
    attentionByHead: blendAttention(edge.attentionByHead, step),
    relation: edge.relation ?? 'citation',
  }))

  if (step % 2 === 1 && nodes.length > 3) {
    const left = nodes[step % nodes.length]
    const right = nodes[(step * 2 + 3) % nodes.length]
    if (left && right && left.id !== right.id) {
      const exists = base.some(
        (edge) =>
          (edge.source === left.id && edge.target === right.id) ||
          (edge.source === right.id && edge.target === left.id),
      )
      if (!exists) {
        base.push({
          id: `dyn-${step}-${left.id}-${right.id}`,
          source: left.id,
          target: right.id,
          weight: Number((0.7 + (step % 3) * 0.15).toFixed(2)),
          attentionByHead: [0.35, 0.48, 0.57, 0.44],
          relation: 'temporal-link',
        })
      }
    }
  }

  return base
}

const generateDynamicNodes = (nodes: GraphNode[], step: number, totalSteps: number) => {
  const normalized = totalSteps <= 1 ? 0 : step / (totalSteps - 1)
  return nodes.map((node, index) => {
    const direction = index % 2 === 0 ? 1 : -1
    const driftX = direction * Math.sin((step + index) / 2.1) * 1.8
    const driftY = direction * Math.cos((step + index) / 2.4) * 1.5
    const confidenceWave = Math.sin(step * 0.6 + index * 0.4) * 0.045
    const trend = normalized * 0.035
    return {
      ...node,
      x: Number((node.x + driftX).toFixed(2)),
      y: Number((node.y + driftY).toFixed(2)),
      confidence: Number(clamp(node.confidence + confidenceWave + trend, 0.5, 0.99).toFixed(3)),
    }
  })
}

export const buildTemporalSnapshots = (
  nodes: GraphNode[],
  edges: GraphEdge[],
  steps = 9,
): TemporalSnapshot[] => {
  const safeSteps = Math.max(2, steps)
  const snapshots: TemporalSnapshot[] = []
  const now = Date.now()

  for (let step = 0; step < safeSteps; step += 1) {
    const nextNodes = generateDynamicNodes(nodes, step, safeSteps)
    const nextEdges = generateDynamicEdges(nextNodes, edges, step)
    snapshots.push({
      step,
      label: dynamicStepLabel(step),
      timestamp: now + step * 12000,
      nodes: withUpdatedDegree(nextNodes, nextEdges),
      edges: nextEdges,
    })
  }

  return snapshots
}

const makeLayer = (
  type: ArchitectureLayerType,
  index: number,
  overrides?: Partial<Omit<ArchitectureLayer, 'id' | 'type'>>,
): ArchitectureLayer => ({
  id: `layer-${type.toLowerCase()}-${index}-${Math.random().toString(36).slice(2, 5)}`,
  type,
  hiddenDim: overrides?.hiddenDim ?? 128,
  heads: overrides?.heads ?? 4,
  dropout: overrides?.dropout ?? 0.2,
  activation: overrides?.activation ?? 'relu',
  residual: overrides?.residual ?? false,
})

export const buildArchitecturePreset = (model: ModelType): ArchitectureSchema => {
  if (model === 'GraphTransformer') {
    return {
      id: `arch-${Date.now()}`,
      name: 'Graph Transformer Research Stack',
      layers: [
        makeLayer('Input', 0, { hiddenDim: 256, dropout: 0 }),
        makeLayer('GraphormerBlock', 1, { hiddenDim: 256, heads: 8, dropout: 0.15, activation: 'gelu', residual: true }),
        makeLayer('GPSLayer', 2, { hiddenDim: 256, heads: 8, dropout: 0.1, activation: 'gelu', residual: true }),
        makeLayer('Readout', 3, { hiddenDim: 256, dropout: 0.05 }),
        makeLayer('MLP', 4, { hiddenDim: 128, dropout: 0.1, activation: 'relu' }),
      ],
    }
  }

  if (model === 'GAT') {
    return {
      id: `arch-${Date.now()}`,
      name: 'GAT Multi-Head Stack',
      layers: [
        makeLayer('Input', 0, { hiddenDim: 128, dropout: 0 }),
        makeLayer('GATConv', 1, { hiddenDim: 128, heads: 8, dropout: 0.3, activation: 'elu' }),
        makeLayer('GATConv', 2, { hiddenDim: 64, heads: 4, dropout: 0.25, activation: 'elu' }),
        makeLayer('Readout', 3, { hiddenDim: 64, dropout: 0.05 }),
        makeLayer('MLP', 4, { hiddenDim: 64, dropout: 0.1 }),
      ],
    }
  }

  if (model === 'GraphSAGE') {
    return {
      id: `arch-${Date.now()}`,
      name: 'GraphSAGE Inductive Stack',
      layers: [
        makeLayer('Input', 0, { hiddenDim: 96, dropout: 0 }),
        makeLayer('SAGEConv', 1, { hiddenDim: 128, heads: 2, dropout: 0.2 }),
        makeLayer('SAGEConv', 2, { hiddenDim: 96, heads: 2, dropout: 0.2 }),
        makeLayer('Readout', 3, { hiddenDim: 96, dropout: 0.05 }),
        makeLayer('MLP', 4, { hiddenDim: 64, dropout: 0.1 }),
      ],
    }
  }

  return {
    id: `arch-${Date.now()}`,
    name: 'GCN Baseline Stack',
    layers: [
      makeLayer('Input', 0, { hiddenDim: 96, dropout: 0 }),
      makeLayer('GCNConv', 1, { hiddenDim: 128, heads: 1, dropout: 0.2 }),
      makeLayer('GCNConv', 2, { hiddenDim: 64, heads: 1, dropout: 0.2 }),
      makeLayer('Readout', 3, { hiddenDim: 64, dropout: 0.05 }),
      makeLayer('MLP', 4, { hiddenDim: 64, dropout: 0.1 }),
    ],
  }
}

export const estimateArchitectureComplexity = (layers: ArchitectureLayer[]) => {
  const depth = layers.length
  const params = layers.reduce((sum, layer) => sum + layer.hiddenDim * Math.max(1, layer.heads) * 9, 0)
  const computeCost = layers.reduce((sum, layer) => sum + layer.hiddenDim * (1 + layer.dropout), 0)
  return {
    depth,
    estimatedParams: params,
    computeCost: Number(computeCost.toFixed(1)),
  }
}

export const defaultGraphTransformerConfig: GraphTransformerConfig = {
  variant: 'Graphormer',
  layers: 6,
  heads: 8,
  hiddenDim: 256,
  dropout: 0.15,
  positionalEncoding: 'laplacian',
  useGlobalToken: true,
}
