import { create } from 'zustand'
import { defaultGraphDataset } from '../data/mockGnn'
import type { ColorMode, LayoutAlgorithm, ProjectionType } from '../types/gnn'
import type { GraphEdge, GraphNode } from '../types/gnn'
import { toGraphEntities } from '../utils/graph'

const defaultGraph = toGraphEntities(defaultGraphDataset)

type GraphState = {
  nodes: GraphNode[]
  edges: GraphEdge[]
  selectedNodes: string[]
  hoveredNode: string | null
  colorMode: ColorMode
  layoutAlgorithm: LayoutAlgorithm
  selectedProjection: ProjectionType
  attentionHead: number
  classFilter: number | 'all'
  showLabels: boolean
  setSelectedNodes: (nodes: string[]) => void
  setHoveredNode: (node: string | null) => void
  setColorMode: (mode: ColorMode) => void
  setLayoutAlgorithm: (algo: LayoutAlgorithm) => void
  setSelectedProjection: (projection: ProjectionType) => void
  setAttentionHead: (head: number) => void
  setClassFilter: (filter: number | 'all') => void
  setShowLabels: (show: boolean) => void
  setGraphData: (nodes: GraphNode[], edges: GraphEdge[]) => void
}

export const useGraphStore = create<GraphState>((set) => ({
  nodes: defaultGraph.nodes,
  edges: defaultGraph.edges,
  selectedNodes: [],
  hoveredNode: null,
  colorMode: 'predicted',
  layoutAlgorithm: 'force',
  selectedProjection: 'pca',
  attentionHead: 2,
  classFilter: 'all',
  showLabels: true,
  setSelectedNodes: (nodes) => set({ selectedNodes: nodes }),
  setHoveredNode: (node) => set({ hoveredNode: node }),
  setColorMode: (mode) => set({ colorMode: mode }),
  setLayoutAlgorithm: (algo) => set({ layoutAlgorithm: algo }),
  setSelectedProjection: (projection) => set({ selectedProjection: projection }),
  setAttentionHead: (head) => set({ attentionHead: head }),
  setClassFilter: (filter) => set({ classFilter: filter }),
  setShowLabels: (show) => set({ showLabels: show }),
  setGraphData: (nodes, edges) =>
    set({
      nodes,
      edges,
      selectedNodes: [],
      hoveredNode: null,
      classFilter: 'all',
    }),
}))

type ModelState = {
  currentModelId: string | null
  selectedDataset: string
  isTraining: boolean
  trainingProgress: number
  currentEpoch: number
  autoRepredict: boolean
  setCurrentModelId: (id: string | null) => void
  setSelectedDataset: (dataset: string) => void
  setIsTraining: (value: boolean) => void
  setTrainingProgress: (value: number) => void
  setCurrentEpoch: (epoch: number) => void
  setAutoRepredict: (value: boolean) => void
}

export const useModelStore = create<ModelState>((set) => ({
  currentModelId: null,
  selectedDataset: 'Cora Citation Network',
  isTraining: false,
  trainingProgress: 0,
  currentEpoch: 0,
  autoRepredict: true,
  setCurrentModelId: (id) => set({ currentModelId: id }),
  setSelectedDataset: (dataset) => set({ selectedDataset: dataset }),
  setIsTraining: (value) => set({ isTraining: value }),
  setTrainingProgress: (value) => set({ trainingProgress: value }),
  setCurrentEpoch: (epoch) => set({ currentEpoch: epoch }),
  setAutoRepredict: (value) => set({ autoRepredict: value }),
}))
