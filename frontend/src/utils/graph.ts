import type { GraphDataset, GraphEdge, GraphNode, RawGraphNode } from '../types/gnn'

const randomInRange = (min: number, max: number) => min + Math.random() * (max - min)

const hashString = (value: string) => {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 1000003
  }
  return hash
}

const seededValue = (key: string, min: number, max: number) => {
  const normalized = (hashString(key) % 1000) / 1000
  return min + normalized * (max - min)
}

const normalizePoint = (value: number, min: number, max: number, fallback: number) => {
  if (max === min) return fallback
  return 10 + ((value - min) / (max - min)) * 80
}

const createFallbackPosition = (index: number, total: number) => {
  const angle = (Math.PI * 2 * index) / Math.max(total, 1)
  return {
    x: 50 + Math.cos(angle) * 30,
    y: 40 + Math.sin(angle) * 28,
  }
}

const sanitizeNode = (node: RawGraphNode, index: number, total: number): GraphNode => {
  const fallback = createFallbackPosition(index, total)
  const features = Array.isArray(node.features) ? node.features.map(Number) : [randomInRange(0.1, 0.9)]
  const meanFeature = features.reduce((sum, value) => sum + value, 0) / Math.max(1, features.length)

  return {
    id: String(node.id),
    label: Number.isFinite(node.label) ? Number(node.label) : 0,
    features,
    degree: 0,
    confidence: Number(Math.min(0.98, Math.max(0.58, 0.55 + meanFeature * 0.42)).toFixed(3)),
    x: Number.isFinite(node.display?.x) ? Number(node.display?.x) : fallback.x,
    y: Number.isFinite(node.display?.y) ? Number(node.display?.y) : fallback.y,
  }
}

const normalizeCoordinates = (nodes: GraphNode[]) => {
  const xs = nodes.map((node) => node.x)
  const ys = nodes.map((node) => node.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  return nodes.map((node) => ({
    ...node,
    x: normalizePoint(node.x, minX, maxX, 50),
    y: normalizePoint(node.y, minY, maxY, 40),
  }))
}

const buildAttention = (key: string) => {
  return [0, 1, 2, 3].map((head) => Number(seededValue(`${key}:${head}`, 0.16, 0.88).toFixed(3)))
}

export const toGraphEntities = (dataset: GraphDataset): { nodes: GraphNode[]; edges: GraphEdge[] } => {
  const rawNodes = dataset.nodes
  const sanitizedNodes = rawNodes.map((node, index) => sanitizeNode(node, index, rawNodes.length))
  const nodeMap = new Map(sanitizedNodes.map((node) => [node.id, node]))

  const edges: GraphEdge[] = dataset.edges
    .map((edge, index) => {
      const edgeId = edge.id ?? `e${index}`
      return {
        id: edgeId,
        source: String(edge.source),
        target: String(edge.target),
        weight: Number.isFinite(edge.weight) ? Number(edge.weight) : 1,
        attentionByHead: buildAttention(`${edgeId}:${edge.source}:${edge.target}`),
      }
    })
    .filter((edge) => nodeMap.has(edge.source) && nodeMap.has(edge.target))

  for (const edge of edges) {
    const source = nodeMap.get(edge.source)
    const target = nodeMap.get(edge.target)
    if (!source || !target) continue
    source.degree += 1
    target.degree += 1
  }

  return {
    nodes: normalizeCoordinates(sanitizedNodes),
    edges,
  }
}

export const validateGraphDataset = (payload: unknown): GraphDataset => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Dataset must be a JSON object.')
  }

  const input = payload as Partial<GraphDataset>
  if (!Array.isArray(input.nodes) || !Array.isArray(input.edges)) {
    throw new Error('Dataset must include nodes and edges arrays.')
  }
  if (input.nodes.length === 0) {
    throw new Error('Dataset must contain at least one node.')
  }

  return {
    name: typeof input.name === 'string' && input.name.trim() ? input.name.trim() : 'Custom Dataset',
    graph_id: input.graph_id,
    directed: Boolean(input.directed),
    nodes: input.nodes,
    edges: input.edges,
  }
}
