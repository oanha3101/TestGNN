import { Layers3, Scale } from 'lucide-react'
import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { classColor } from '../../data/mockGnn'
import { useGraphStore } from '../../store/useStore'
import type { ModelType } from '../../types/gnn'

type ModelName = ModelType

const models: ModelName[] = ['GCN', 'GAT', 'GraphSAGE', 'GraphTransformer']

const predictedLabel = (model: ModelName, baseLabel: number, id: string) => {
  const numeric = Number(id.replace(/\D/g, '')) || 0
  if (model === 'GCN') return (baseLabel + (numeric % 2 === 0 ? 0 : 1)) % 4
  if (model === 'GAT') return (baseLabel + (numeric % 3 === 0 ? 0 : 1)) % 4
  if (model === 'GraphTransformer') return (baseLabel + (numeric % 7 === 0 ? 0 : numeric % 2 === 0 ? 0 : 1)) % 4
  return (baseLabel + (numeric % 5 === 0 ? 0 : 2)) % 4
}

const modelAccuracy = (model: ModelName, labels: { id: string; label: number }[]) => {
  const correct = labels.filter((node) => predictedLabel(model, node.label, node.id) === node.label).length
  return labels.length === 0 ? 0 : correct / labels.length
}

export function ModelComparisonPanel() {
  const nodes = useGraphStore((state) => state.nodes)
  const edges = useGraphStore((state) => state.edges)

  const points = useMemo(
    () =>
      nodes.map((node) => ({
        id: node.id,
        x: 12 + ((node.x - 10) / 80) * 76,
        y: 12 + ((node.y - 10) / 80) * 76,
        label: node.label,
      })),
    [nodes],
  )

  const stats = useMemo(
    () =>
      models.map((model) => ({
        model,
        accuracy: modelAccuracy(
          model,
          nodes.map((node) => ({ id: node.id, label: node.label })),
        ),
      })),
    [nodes],
  )

  const agreement = useMemo(() => {
    return models.map((left) =>
      models.map((right) => {
        if (left === right) return 1
        let same = 0
        for (const node of nodes) {
          const a = predictedLabel(left, node.label, node.id)
          const b = predictedLabel(right, node.label, node.id)
          if (a === b) same += 1
        }
        return nodes.length === 0 ? 0 : same / nodes.length
      }),
    )
  }, [nodes])

  return (
    <section className="panel comparison-panel">
      <div className="social-panel-head">
        <div>
          <h2 className="panel-title">
            <Layers3 size={18} />
            Model Comparison
          </h2>
          <p className="panel-subtitle">Side-by-side prediction snapshots, relative accuracy, and agreement matrix.</p>
        </div>
        <div className="topbar-chip">
          <Scale size={12} />
          {nodes.length} labeled nodes
        </div>
      </div>

      <div className="dashboard-grid comparison-dashboard-grid">
        <article className="chart-card">
          <header className="chart-card-head">
            <strong>Accuracy spread</strong>
            <span>Estimated from current label alignment</span>
          </header>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stats} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="model" tickLine={false} axisLine={false} />
              <YAxis
                tickFormatter={(value) => `${Math.round(Number(value) * 100)}%`}
                tickLine={false}
                axisLine={false}
                width={46}
              />
              <Tooltip formatter={(value) => `${(Number(value ?? 0) * 100).toFixed(1)}%`} />
              <Bar dataKey="accuracy" fill="#5b76fe" radius={[12, 12, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </article>

        <article className="chart-card">
          <header className="chart-card-head">
            <strong>Prediction snapshots</strong>
            <span>Quick visual scan across architectures</span>
          </header>
          <div className="comparison-grid">
            {models.map((model) => (
              <article key={model} className="comparison-card">
                <header>
                  <strong>{model}</strong>
                  <span>
                    {((stats.find((item) => item.model === model)?.accuracy ?? 0) * 100).toFixed(1)}%
                  </span>
                </header>
                <svg viewBox="0 0 100 100">
                  {edges.map((edge) => {
                    const source = points.find((node) => node.id === edge.source)
                    const target = points.find((node) => node.id === edge.target)
                    if (!source || !target) return null
                    return (
                      <line
                        key={`${model}-${edge.id}`}
                        x1={source.x}
                        y1={source.y}
                        x2={target.x}
                        y2={target.y}
                        stroke="rgba(120, 132, 169, 0.38)"
                        strokeWidth={0.6}
                      />
                    )
                  })}
                  {points.map((point) => {
                    const pred = predictedLabel(model, point.label, point.id)
                    return (
                      <circle key={`${model}-${point.id}`} cx={point.x} cy={point.y} r={3.1} fill={classColor(pred)} />
                    )
                  })}
                </svg>
              </article>
            ))}
          </div>
        </article>
      </div>

      <div className="agreement-table" role="table" aria-label="Model agreement matrix">
        <div className="agreement-row agreement-header" role="row">
          <span />
          {models.map((model) => (
            <strong key={`header-${model}`}>{model}</strong>
          ))}
        </div>
        {agreement.map((row, rowIndex) => (
          <div key={models[rowIndex]} className="agreement-row" role="row">
            <strong>{models[rowIndex]}</strong>
            {row.map((value, colIndex) => (
              <span key={`${models[rowIndex]}-${models[colIndex]}`}>{Math.round(value * 100)}%</span>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}
