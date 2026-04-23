export type ModelType = 'GCN' | 'GAT' | 'GraphSAGE' | 'GraphTransformer'

export type ColorMode = 'predicted' | 'groundtruth' | 'cluster' | 'attention'

export type LayoutAlgorithm = 'force' | 'circular' | 'hierarchical'

export type ProjectionType = 'pca' | 'tsne' | 'umap'

export type GraphNode = {
  id: string
  x: number
  y: number
  degree: number
  label: number
  confidence: number
  features: number[]
}

export type GraphEdge = {
  id: string
  source: string
  target: string
  weight: number
  attentionByHead: number[]
  relation?: string
}

export type RawGraphNode = {
  id: string
  label?: number
  features?: number[]
  display?: {
    x?: number
    y?: number
  }
}

export type RawGraphEdge = {
  id?: string
  source: string
  target: string
  weight?: number
}

export type GraphDataset = {
  graph_id?: string
  name: string
  directed?: boolean
  nodes: RawGraphNode[]
  edges: RawGraphEdge[]
}

export type TrainingPoint = {
  epoch: number
  loss: number
  accuracy: number
}

export type StreamEvent = {
  id: string
  level: 'info' | 'success' | 'warn'
  message: string
  createdAt: number
}

export type TrainingJobEvent = {
  type: 'progress' | 'done'
  epoch: number
  epochs: number
  loss: number
  accuracy: number
}

export type ExplainerFeature = {
  featureIndex: number
  importance: number
}

export type ExplainerEdge = {
  edgeId: string
  source: string
  target: string
  importance: number
}

export type ExplainerResult = {
  nodeId: string
  importantFeatures: ExplainerFeature[]
  importantEdges: ExplainerEdge[]
  score: number
}

export type TemporalSnapshot = {
  step: number
  label: string
  timestamp: number
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export type GraphTransformerVariant = 'Graphormer' | 'GPS' | 'SAN'

export type PositionalEncoding = 'laplacian' | 'rwse' | 'none'

export type GraphTransformerConfig = {
  variant: GraphTransformerVariant
  layers: number
  heads: number
  hiddenDim: number
  dropout: number
  positionalEncoding: PositionalEncoding
  useGlobalToken: boolean
}

export type ArchitectureLayerType =
  | 'Input'
  | 'GCNConv'
  | 'GATConv'
  | 'SAGEConv'
  | 'GraphormerBlock'
  | 'GPSLayer'
  | 'Readout'
  | 'MLP'

export type ActivationType = 'relu' | 'gelu' | 'elu'

export type ArchitectureLayer = {
  id: string
  type: ArchitectureLayerType
  hiddenDim: number
  heads: number
  dropout: number
  activation: ActivationType
  residual: boolean
}

export type ArchitectureSchema = {
  id: string
  name: string
  layers: ArchitectureLayer[]
}
