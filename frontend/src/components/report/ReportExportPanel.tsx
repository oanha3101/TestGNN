import { Download, FileText, Printer, Share2 } from 'lucide-react'
import type { ExplainerResult, GraphEdge, GraphNode, ModelType, TrainingPoint } from '../../types/gnn'
import { exportExperimentReport } from '../../utils/reportExport'

type ReportExportPanelProps = {
  datasetName: string
  model: ModelType
  currentEpoch: number
  nodes: GraphNode[]
  edges: GraphEdge[]
  history: TrainingPoint[]
  explanation: ExplainerResult | null
  trainingRunId: string | null
  onExportComplete: (format: 'HTML' | 'PDF') => void
  onExportBlocked: () => void
}

export function ReportExportPanel({
  datasetName,
  model,
  currentEpoch,
  nodes,
  edges,
  history,
  explanation,
  trainingRunId,
  onExportComplete,
  onExportBlocked,
}: ReportExportPanelProps) {
  const latestPoint = history[history.length - 1]
  const reportInput = {
    datasetName,
    model,
    currentEpoch,
    nodes,
    edges,
    history,
    explanation,
    trainingRunId,
  }

  const exportReport = (format: 'html' | 'pdf') => {
    const exported = exportExperimentReport(reportInput, format)
    if (!exported) {
      onExportBlocked()
      return
    }
    onExportComplete(format === 'html' ? 'HTML' : 'PDF')
  }

  return (
    <section className="panel report-export-panel">
      <div className="social-panel-head">
        <div>
          <h2 className="panel-title">
            <FileText size={18} />
            Export Report
          </h2>
          <p className="panel-subtitle">US-009 PDF/HTML experiment package with metrics and visualizations.</p>
        </div>
        <div className="topbar-chip">
          <Share2 size={12} />
          {history.length} epochs
        </div>
      </div>

      <div className="report-summary-grid">
        <article>
          <span>Dataset</span>
          <strong>{datasetName}</strong>
        </article>
        <article>
          <span>Model</span>
          <strong>{model}</strong>
        </article>
        <article>
          <span>Latest accuracy</span>
          <strong>{latestPoint ? `${latestPoint.accuracy.toFixed(1)}%` : '--'}</strong>
        </article>
        <article>
          <span>Graph</span>
          <strong>
            {nodes.length}/{edges.length}
          </strong>
        </article>
      </div>

      <div className="report-includes-list" aria-label="Report sections">
        <span>Experiment summary</span>
        <span>Graph snapshot</span>
        <span>Learning curve</span>
        <span>Model benchmark</span>
        <span>GNNExplainer notes</span>
      </div>

      <div className="report-export-actions">
        <button type="button" className="cta" onClick={() => exportReport('html')}>
          <Download size={16} />
          Download HTML
        </button>
        <button type="button" className="chip" onClick={() => exportReport('pdf')}>
          <Printer size={16} />
          Save as PDF
        </button>
      </div>
    </section>
  )
}
