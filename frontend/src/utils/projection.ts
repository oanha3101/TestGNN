import type { GraphNode, ProjectionType } from '../types/gnn'

type Point2D = { id: string; x: number; y: number; label: number }

const centerColumns = (matrix: number[][]) => {
  const rows = matrix.length
  const cols = matrix[0]?.length ?? 0
  const means = Array.from({ length: cols }, (_, col) => {
    let sum = 0
    for (let row = 0; row < rows; row += 1) sum += matrix[row][col]
    return sum / rows
  })
  return matrix.map((row) => row.map((value, index) => value - means[index]))
}

const covariance = (matrix: number[][]) => {
  const n = matrix.length
  const dims = matrix[0]?.length ?? 0
  const cov = Array.from({ length: dims }, () => Array.from({ length: dims }, () => 0))
  for (let i = 0; i < dims; i += 1) {
    for (let j = 0; j < dims; j += 1) {
      let sum = 0
      for (let r = 0; r < n; r += 1) sum += matrix[r][i] * matrix[r][j]
      cov[i][j] = sum / Math.max(1, n - 1)
    }
  }
  return cov
}

const multiplyMatrixVector = (matrix: number[][], vector: number[]) => {
  return matrix.map((row) => row.reduce((sum, value, index) => sum + value * vector[index], 0))
}

const normalizeVector = (vector: number[]) => {
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1
  return vector.map((value) => value / norm)
}

const powerIteration = (matrix: number[][], maxIterations = 80) => {
  const dim = matrix.length
  let vector: number[] = Array.from({ length: dim }, (_, index) => (index === 0 ? 1 : 0.5))
  vector = normalizeVector(vector)

  for (let i = 0; i < maxIterations; i += 1) {
    vector = normalizeVector(multiplyMatrixVector(matrix, vector))
  }
  return vector
}

const dot = (a: number[], b: number[]) => a.reduce((sum, value, index) => sum + value * b[index], 0)

const deflate = (matrix: number[][], eigenVector: number[]) => {
  const eigenValue = dot(eigenVector, multiplyMatrixVector(matrix, eigenVector))
  return matrix.map((row, i) => row.map((value, j) => value - eigenValue * eigenVector[i] * eigenVector[j]))
}

const normalizePoints = (points: Point2D[]) => {
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  return points.map((point) => ({
    ...point,
    x: maxX === minX ? 0 : ((point.x - minX) / (maxX - minX)) * 100,
    y: maxY === minY ? 0 : ((point.y - minY) / (maxY - minY)) * 100,
  }))
}

const computePca = (nodes: GraphNode[]): Point2D[] => {
  const featureSize = Math.max(...nodes.map((node) => node.features.length))
  const matrix = nodes.map((node) => {
    const row = Array.from({ length: featureSize }, (_, index) => Number(node.features[index] ?? 0))
    row.push(node.degree / 10)
    return row
  })

  if (matrix.length < 2 || matrix[0].length < 2) {
    return nodes.map((node) => ({ id: node.id, x: node.x, y: node.y, label: node.label }))
  }

  const centered = centerColumns(matrix)
  const cov = covariance(centered)
  const pc1 = powerIteration(cov)
  const pc2 = powerIteration(deflate(cov, pc1))

  const points = centered.map((row, index) => ({
    id: nodes[index].id,
    x: dot(row, pc1),
    y: dot(row, pc2),
    label: nodes[index].label,
  }))

  return normalizePoints(points)
}

const computeTsneLike = (nodes: GraphNode[]): Point2D[] => {
  const points = nodes.map((node, index) => ({
    id: node.id,
    x: node.x + Math.sin(index * 0.9 + node.degree) * 5,
    y: node.y + Math.cos(index * 0.8 + node.label) * 5,
    label: node.label,
  }))
  return normalizePoints(points)
}

const computeUmapLike = (nodes: GraphNode[]): Point2D[] => {
  const points = nodes.map((node, index) => ({
    id: node.id,
    x: node.x * 0.75 + node.degree * 3 + Math.sin(index) * 2,
    y: node.y * 0.78 + node.label * 8 + Math.cos(index) * 2,
    label: node.label,
  }))
  return normalizePoints(points)
}

export const buildProjection = (nodes: GraphNode[], projection: ProjectionType): Point2D[] => {
  if (projection === 'pca') return computePca(nodes)
  if (projection === 'tsne') return computeTsneLike(nodes)
  return computeUmapLike(nodes)
}
