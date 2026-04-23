import { Aperture, Flame } from 'lucide-react'
import { useGraphStore } from '../../store/useStore'
import type { ExplainerResult } from '../../types/gnn'

type AttentionVizPanelProps = {
  explanation: ExplainerResult | null
  threshold: number
}

export function AttentionVizPanel({ explanation, threshold }: AttentionVizPanelProps) {
  const edges = useGraphStore((state) => state.edges)
  const head = useGraphStore((state) => state.attentionHead)

  const rows = edges
    .map((edge) => {
      const attention = edge.attentionByHead[head] ?? 0
      const explain = explanation?.importantEdges.find((item) => item.edgeId === edge.id)?.importance ?? 0
      return {
        edgeId: edge.id,
        label: `${edge.source} -> ${edge.target}`,
        attention,
        explain,
      }
    })
    .sort((a, b) => b.attention - a.attention)
    .slice(0, 7)

  return (
    <section className="panel attention-panel">
      <div className="social-panel-head">
        <div>
          <h2 className="panel-title">
            <Aperture size={18} />
            Attention Lens
          </h2>
          <p className="panel-subtitle">Head #{head} edge saliency with explainability overlay and threshold tagging.</p>
        </div>
        <div className="topbar-chip">Threshold {Math.round(threshold * 100)}%</div>
      </div>

      <div className="attention-legend">
        <span>Low</span>
        <div />
        <span>High</span>
      </div>

      <div className="attention-list">
        {rows.map((row) => (
          <article key={row.edgeId} className="attention-item">
            <header>
              <strong>{row.label}</strong>
              <span>{(row.attention * 100).toFixed(1)}%</span>
            </header>
            <div className="attention-meter">
              <span style={{ width: `${Math.max(4, row.attention * 100)}%` }} />
            </div>
            {row.explain >= threshold ? (
              <div className="attention-tag">
                <Flame size={12} />
                Explainer {Math.round(row.explain * 100)}%
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  )
}
