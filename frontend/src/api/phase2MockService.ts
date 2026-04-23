import type { ExplainerResult, GraphEdge, GraphNode } from '../types/gnn'

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export const runExplainer = async ({
  nodeId,
  nodes,
  edges,
}: {
  nodeId: string
  nodes: GraphNode[]
  edges: GraphEdge[]
}): Promise<ExplainerResult> => {
  await sleep(700)

  const node = nodes.find((item) => item.id === nodeId)
  if (!node) {
    throw new Error('Node not found for explanation.')
  }

  const relatedEdges = edges
    .filter((edge) => edge.source === nodeId || edge.target === nodeId)
    .map((edge) => {
      const avgAttention =
        edge.attentionByHead.reduce((sum, value) => sum + value, 0) / Math.max(1, edge.attentionByHead.length)
      const degreeBoost = clamp(node.degree / 10, 0, 0.25)
      const importance = clamp(avgAttention * 0.85 + degreeBoost + Math.random() * 0.08, 0.05, 0.99)
      return {
        edgeId: edge.id,
        source: edge.source,
        target: edge.target,
        importance: Number(importance.toFixed(3)),
      }
    })
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 8)

  const featureScores = node.features
    .map((feature, index) => ({
      featureIndex: index,
      importance: Number(clamp(Math.abs(feature) * 0.92 + Math.random() * 0.18, 0.02, 0.98).toFixed(3)),
    }))
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 10)

  const scoreBase = relatedEdges.length > 0 ? relatedEdges[0].importance : 0.45
  const score = Number(clamp(scoreBase + Math.random() * 0.06, 0.42, 0.97).toFixed(3))

  return {
    nodeId,
    importantEdges: relatedEdges,
    importantFeatures: featureScores,
    score,
  }
}
