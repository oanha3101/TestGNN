import type {
  GraphDataset,
  GraphEdge,
  GraphNode,
  ModelType,
  StreamEvent,
  TrainingPoint,
} from '../types/gnn'

export const graphNodes: GraphNode[] = [
  { id: 'v0', x: 16, y: 36, degree: 4, label: 0, confidence: 0.95, features: [0.9, 0.3, 0.2, 0.7] },
  { id: 'v1', x: 28, y: 14, degree: 3, label: 0, confidence: 0.88, features: [0.8, 0.2, 0.1, 0.5] },
  { id: 'v2', x: 46, y: 24, degree: 6, label: 1, confidence: 0.92, features: [0.1, 0.7, 0.8, 0.3] },
  { id: 'v3', x: 64, y: 16, degree: 4, label: 1, confidence: 0.91, features: [0.2, 0.8, 0.9, 0.4] },
  { id: 'v4', x: 82, y: 34, degree: 5, label: 2, confidence: 0.87, features: [0.4, 0.3, 0.8, 0.9] },
  { id: 'v5', x: 69, y: 58, degree: 5, label: 2, confidence: 0.9, features: [0.5, 0.2, 0.7, 0.8] },
  { id: 'v6', x: 45, y: 66, degree: 7, label: 3, confidence: 0.93, features: [0.7, 0.7, 0.3, 0.2] },
  { id: 'v7', x: 24, y: 58, degree: 4, label: 3, confidence: 0.9, features: [0.8, 0.6, 0.2, 0.1] },
]

export const graphEdges: GraphEdge[] = [
  { id: 'e0', source: 'v0', target: 'v1', weight: 1, attentionByHead: [0.14, 0.2, 0.34, 0.18] },
  { id: 'e1', source: 'v0', target: 'v2', weight: 1, attentionByHead: [0.28, 0.55, 0.71, 0.62] },
  { id: 'e2', source: 'v1', target: 'v2', weight: 1, attentionByHead: [0.36, 0.31, 0.49, 0.41] },
  { id: 'e3', source: 'v2', target: 'v3', weight: 1, attentionByHead: [0.63, 0.8, 0.82, 0.74] },
  { id: 'e4', source: 'v3', target: 'v4', weight: 1, attentionByHead: [0.36, 0.49, 0.58, 0.45] },
  { id: 'e5', source: 'v4', target: 'v5', weight: 1, attentionByHead: [0.55, 0.64, 0.66, 0.51] },
  { id: 'e6', source: 'v5', target: 'v6', weight: 1, attentionByHead: [0.62, 0.77, 0.79, 0.73] },
  { id: 'e7', source: 'v6', target: 'v7', weight: 1, attentionByHead: [0.2, 0.39, 0.44, 0.37] },
  { id: 'e8', source: 'v7', target: 'v0', weight: 1, attentionByHead: [0.43, 0.57, 0.61, 0.53] },
  { id: 'e9', source: 'v2', target: 'v6', weight: 1, attentionByHead: [0.67, 0.84, 0.88, 0.8] },
]

export const defaultGraphDataset: GraphDataset = {
  name: 'Cora Citation Network',
  directed: false,
  nodes: graphNodes.map((node) => ({
    id: node.id,
    label: node.label,
    features: node.features,
    display: { x: node.x, y: node.y },
  })),
  edges: graphEdges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    weight: edge.weight,
  })),
}

export const datasets = ['Cora Citation Network', 'PubMed', 'Citeseer', 'Custom JSON']

export const modelInfo: Record<ModelType, { subtitle: string; accuracy: number; f1: number }> = {
  GCN: { subtitle: 'Baseline spectral convolution', accuracy: 0.842, f1: 0.831 },
  GAT: { subtitle: 'Attention-driven message passing', accuracy: 0.887, f1: 0.874 },
  GraphSAGE: { subtitle: 'Inductive neighborhood aggregator', accuracy: 0.866, f1: 0.852 },
  GraphTransformer: { subtitle: 'Global token + structural encoding transformer', accuracy: 0.902, f1: 0.891 },
}

export const modelComparison = [
  { name: 'GCN', accuracy: 0.842, f1: 0.831, latency: 112, trainTime: 46 },
  { name: 'GAT', accuracy: 0.887, f1: 0.874, latency: 145, trainTime: 54 },
  { name: 'GraphSAGE', accuracy: 0.866, f1: 0.852, latency: 121, trainTime: 43 },
  { name: 'GraphTransformer', accuracy: 0.902, f1: 0.891, latency: 176, trainTime: 72 },
]

export const messagePassingPhases = [
  'Node Feature Encode',
  'Neighborhood Aggregate',
  'Attention Weighting',
  'Update Hidden State',
  'Readout and Predict',
]

const eventScript: StreamEvent[] = [
  { id: 's0', level: 'info', message: 'Dataset loaded from cache: Cora (2,708 nodes).', createdAt: Date.now() - 100000 },
  { id: 's1', level: 'info', message: 'Batch #18 queued for GPU worker 0.', createdAt: Date.now() - 84000 },
  { id: 's2', level: 'success', message: 'Validation accuracy improved to 87.2%.', createdAt: Date.now() - 72000 },
  { id: 's3', level: 'info', message: 'Embedding projection refreshed with PCA(2).', createdAt: Date.now() - 62000 },
  { id: 's4', level: 'warn', message: 'Attention head #1 saturated on class-2 region.', createdAt: Date.now() - 43000 },
  { id: 's5', level: 'success', message: 'Checkpoint saved: model_gat_epoch_156.pt', createdAt: Date.now() - 26000 },
]

export const initialStreamEvents = eventScript.slice(0, 3)

export const getNextEvent = (index: number) => {
  return eventScript[index % eventScript.length]
}

export const classColor = (label: number) => {
  if (label === 0) return '#c2ef4e' // Lime Green
  if (label === 1) return '#ffb287' // Coral
  if (label === 2) return '#fa7faa' // Pink
  return '#6a5fc1' // Sentry Purple
}

export const makeTrainingHistory = (epoch: number): TrainingPoint[] => {
  return Array.from({ length: epoch }).map((_, i) => {
    const e = i + 1
    const loss = Math.max(0.11, 1.22 * Math.exp(-e / 31) + 0.03 * Math.sin(e / 7))
    const acc = Math.min(0.92, 0.46 + 0.46 * (1 - Math.exp(-e / 27)))
    return {
      epoch: e,
      loss: Number(loss.toFixed(3)),
      accuracy: Number((acc * 100).toFixed(1)),
    }
  })
}
