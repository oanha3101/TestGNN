import { modelComparison, modelInfo } from '../data/mockGnn'
import type { ExplainerResult, GraphEdge, GraphNode, ModelType, TrainingPoint } from '../types/gnn'

export type ExperimentReportInput = {
  datasetName: string
  model: ModelType
  currentEpoch: number
  nodes: GraphNode[]
  edges: GraphEdge[]
  history: TrainingPoint[]
  explanation: ExplainerResult | null
  trainingRunId: string | null
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const toPercent = (value: number) => `${(value * 100).toFixed(1)}%`

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

const buildGraphSvg = (nodes: GraphNode[], edges: GraphEdge[]) => {
  const palette = ['#5b76fe', '#00b473', '#ff7a59', '#8a63d2']
  const points = nodes.map((node) => ({
    ...node,
    x: 42 + (node.x / 100) * 716,
    y: 40 + (node.y / 100) * 340,
  }))

  const edgeMarkup = edges
    .map((edge) => {
      const source = points.find((node) => node.id === edge.source)
      const target = points.find((node) => node.id === edge.target)
      if (!source || !target) return ''
      const attention = edge.attentionByHead.reduce((sum, item) => sum + item, 0) / edge.attentionByHead.length
      return `<line x1="${source.x}" y1="${source.y}" x2="${target.x}" y2="${target.y}" stroke="#738098" stroke-opacity="${Math.min(0.85, 0.28 + attention * 0.58)}" stroke-width="${1.2 + attention * 2.4}" />`
    })
    .join('')

  const nodeMarkup = points
    .map(
      (node) =>
        `<g><circle cx="${node.x}" cy="${node.y}" r="11" fill="${palette[node.label % palette.length]}" stroke="#ffffff" stroke-width="3" /><text x="${node.x}" y="${node.y + 25}" text-anchor="middle" fill="#2f3547" font-size="12" font-weight="700">${escapeHtml(node.id)}</text></g>`,
    )
    .join('')

  return `<svg viewBox="0 0 800 420" role="img" aria-label="Graph visualization snapshot"><rect width="800" height="420" rx="28" fill="#f6f8fc" /><g>${edgeMarkup}${nodeMarkup}</g></svg>`
}

const buildLearningSvg = (history: TrainingPoint[]) => {
  if (history.length === 0) {
    return `<div class="empty-chart">No training history captured yet.</div>`
  }

  const width = 800
  const height = 320
  const padX = 48
  const padY = 34
  const maxEpoch = Math.max(...history.map((point) => point.epoch), 1)
  const maxLoss = Math.max(...history.map((point) => point.loss), 1)

  const toX = (epoch: number) => padX + ((epoch - 1) / Math.max(1, maxEpoch - 1)) * (width - padX * 2)
  const toAccuracyY = (accuracy: number) => height - padY - (accuracy / 100) * (height - padY * 2)
  const toLossY = (loss: number) => height - padY - (loss / maxLoss) * (height - padY * 2)
  const toPath = (points: TrainingPoint[], yAccessor: (point: TrainingPoint) => number) =>
    points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${toX(point.epoch).toFixed(1)} ${yAccessor(point).toFixed(1)}`).join(' ')

  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Learning curve"><rect width="${width}" height="${height}" rx="24" fill="#ffffff" /><g stroke="#e6ebf3" stroke-width="1">${[0.25, 0.5, 0.75].map((tick) => `<line x1="${padX}" y1="${padY + tick * (height - padY * 2)}" x2="${width - padX}" y2="${padY + tick * (height - padY * 2)}" />`).join('')}</g><path d="${toPath(history, (point) => toAccuracyY(point.accuracy))}" fill="none" stroke="#5b76fe" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" /><path d="${toPath(history, (point) => toLossY(point.loss))}" fill="none" stroke="#ff7a59" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" /><text x="${padX}" y="${height - 10}" fill="#6f7687" font-size="13">Epoch 1</text><text x="${width - padX}" y="${height - 10}" fill="#6f7687" font-size="13" text-anchor="end">Epoch ${maxEpoch}</text><circle cx="${width - 188}" cy="26" r="6" fill="#5b76fe" /><text x="${width - 176}" y="31" fill="#31405d" font-size="13">Accuracy</text><circle cx="${width - 96}" cy="26" r="6" fill="#ff7a59" /><text x="${width - 84}" y="31" fill="#31405d" font-size="13">Loss</text></svg>`
}

const buildMetricsRows = (input: ExperimentReportInput) => {
  const latest = input.history[input.history.length - 1]
  const bestAccuracy = input.history.length === 0 ? null : Math.max(...input.history.map((point) => point.accuracy))
  const bestLoss = input.history.length === 0 ? null : Math.min(...input.history.map((point) => point.loss))
  return [
    ['Dataset', input.datasetName],
    ['Model', input.model],
    ['Training run', input.trainingRunId ?? 'Local simulation'],
    ['Epochs captured', String(input.currentEpoch || input.history.length)],
    ['Latest accuracy', latest ? `${latest.accuracy.toFixed(1)}%` : 'Pending'],
    ['Best accuracy', bestAccuracy === null ? 'Pending' : `${bestAccuracy.toFixed(1)}%`],
    ['Best loss', bestLoss === null ? 'Pending' : bestLoss.toFixed(3)],
    ['Graph size', `${input.nodes.length} nodes / ${input.edges.length} edges`],
    ['Benchmark accuracy', toPercent(modelInfo[input.model].accuracy)],
    ['Benchmark F1', toPercent(modelInfo[input.model].f1)],
  ]
}

const buildHtmlReport = (input: ExperimentReportInput) => {
  const generatedAt = new Date().toLocaleString()
  const metricsRows = buildMetricsRows(input)
    .map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`)
    .join('')
  const benchmarkRows = modelComparison
    .map(
      (item) =>
        `<tr><td>${escapeHtml(item.name)}</td><td>${toPercent(item.accuracy)}</td><td>${toPercent(item.f1)}</td><td>${item.latency} ms</td><td>${item.trainTime} min</td></tr>`,
    )
    .join('')
  const historyRows = input.history
    .slice(-20)
    .map((point) => `<tr><td>${point.epoch}</td><td>${point.loss.toFixed(3)}</td><td>${point.accuracy.toFixed(1)}%</td></tr>`)
    .join('')
  const explanationSection = input.explanation
    ? `<section><h2>GNNExplainer Summary</h2><p>Node <strong>${escapeHtml(input.explanation.nodeId)}</strong> explanation score: <strong>${toPercent(input.explanation.score)}</strong>.</p><div class="pill-row">${input.explanation.importantFeatures.map((feature) => `<span>Feature ${feature.featureIndex}: ${toPercent(feature.importance)}</span>`).join('')}</div></section>`
    : `<section><h2>GNNExplainer Summary</h2><p>No explainer run was attached to this report.</p></section>`

  return `<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>GNN Experiment Report - ${escapeHtml(input.datasetName)}</title><style>body{margin:0;background:#eef2f7;color:#222a3d;font-family:Inter,Arial,sans-serif}main{max-width:980px;margin:0 auto;padding:36px}header,section{background:#fff;border:1px solid #dde4f0;border-radius:28px;padding:28px;margin-bottom:22px;box-shadow:0 16px 42px rgba(43,52,78,.08)}h1,h2{margin:0;color:#1e2536}h1{font-size:36px;letter-spacing:-.04em}h2{font-size:22px;margin-bottom:16px}.eyebrow{color:#5b76fe;font-weight:800;text-transform:uppercase;letter-spacing:.1em;font-size:12px}.muted{color:#6f7687}.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}table{width:100%;border-collapse:collapse;border:1px solid #e8ecf3;border-radius:18px;overflow:hidden}th,td{text-align:left;padding:12px 14px;border-bottom:1px solid #eef2f7}th{width:38%;background:#f8faff;color:#596176}.pill-row{display:flex;gap:10px;flex-wrap:wrap}.pill-row span{display:inline-flex;border-radius:999px;background:#edf2ff;color:#425bd8;padding:8px 12px;font-weight:700;font-size:13px}.legend{display:flex;gap:18px;color:#596176;font-weight:700}.legend i{width:12px;height:12px;border-radius:50%;display:inline-block;margin-right:6px}.empty-chart{display:grid;place-items:center;height:220px;border:1px dashed #cfd8e8;border-radius:24px;color:#6f7687}@media print{body{background:#fff}main{padding:0}header,section{box-shadow:none;break-inside:avoid}.no-print{display:none}}@media(max-width:760px){main{padding:18px}.grid{grid-template-columns:1fr}}</style></head><body><main><header><p class="eyebrow">US-009 Export Report</p><h1>${escapeHtml(input.model)} experiment on ${escapeHtml(input.datasetName)}</h1><p class="muted">Generated ${escapeHtml(generatedAt)} with experiment metrics, graph visualization, learning curve, and benchmark comparison.</p><div class="pill-row"><span>${input.nodes.length} nodes</span><span>${input.edges.length} edges</span><span>${input.currentEpoch || input.history.length} epochs</span><span>${escapeHtml(input.model)}</span></div></header><section><h2>Experiment Summary</h2><table>${metricsRows}</table></section><section><h2>Visualization Snapshot</h2>${buildGraphSvg(input.nodes, input.edges)}<p class="muted">Edge opacity and thickness summarize attention-head intensity.</p></section><section><h2>Learning Curve</h2>${buildLearningSvg(input.history)}</section><section><h2>Model Benchmark</h2><table><tr><th>Model</th><th>Accuracy</th><th>F1</th><th>Latency</th><th>Train time</th></tr>${benchmarkRows}</table></section><section><h2>Recent Training Metrics</h2>${input.history.length === 0 ? '<p class="muted">Start training to include per-epoch metrics.</p>' : `<table><tr><th>Epoch</th><th>Loss</th><th>Accuracy</th></tr>${historyRows}</table>`}</section>${explanationSection}<section class="no-print"><h2>PDF Export</h2><p class="muted">Use your browser print dialog and choose “Save as PDF” to keep this report as a PDF.</p><button onclick="window.print()" style="border:0;border-radius:14px;background:#5b76fe;color:#fff;padding:12px 18px;font-weight:800;cursor:pointer">Save as PDF</button></section></main></body></html>`
}

const filenameBase = (datasetName: string, model: string) =>
  `gnn-report-${datasetName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${model.toLowerCase()}-${new Date().toISOString().slice(0, 10)}`

export const exportExperimentReport = (input: ExperimentReportInput, format: 'html' | 'pdf') => {
  const html = buildHtmlReport(input)
  if (format === 'pdf') {
    const printWindow = window.open('', '_blank', 'noopener,noreferrer')
    if (!printWindow) return false
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    window.setTimeout(() => printWindow.print(), 250)
    return true
  }

  downloadBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), `${filenameBase(input.datasetName, input.model)}.html`)
  return true
}
