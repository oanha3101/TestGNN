import { Activity, Gauge, Sparkles, TrendingUp } from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { modelComparison, modelInfo } from '../../data/mockGnn'
import { useModelStore } from '../../store/useStore'
import type { ModelType, TrainingPoint } from '../../types/gnn'

type TrainingDashboardProps = {
  model: ModelType
  trainingHistory: TrainingPoint[]
}

export function TrainingDashboard({ model, trainingHistory }: TrainingDashboardProps) {
  const currentEpoch = useModelStore((state) => state.currentEpoch)
  const recentHistory = trainingHistory.slice(Math.max(0, trainingHistory.length - 42))
  const activeModelStats = modelInfo[model]
  const lastPoint = recentHistory[recentHistory.length - 1]

  const comparisonData = modelComparison.map((item) => ({
    name: item.name,
    accuracy: Number((item.accuracy * 100).toFixed(1)),
  }))

  return (
    <section className="dashboard-card training-dashboard-card">
      <div className="dashboard-head">
        <div>
          <h3 className="dashboard-title">
            <Activity size={18} />
            Training Analytics
          </h3>
          <p className="dashboard-copy">{modelInfo[model].subtitle}</p>
        </div>
        <span className="dashboard-badge">{model}</span>
      </div>

      <div className="metric-strip">
        <article className="metric-card">
          <span className="metric-label">Current epoch</span>
          <strong>{currentEpoch}</strong>
          <span className="metric-delta">
            <Gauge size={14} />
            / 200 planned
          </span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Latest accuracy</span>
          <strong>{lastPoint ? `${lastPoint.accuracy.toFixed(1)}%` : '--'}</strong>
          <span className="metric-delta">
            <TrendingUp size={14} />
            Target F1 {(activeModelStats.f1 * 100).toFixed(1)}%
          </span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Latest loss</span>
          <strong>{lastPoint ? lastPoint.loss.toFixed(3) : '--'}</strong>
          <span className="metric-delta muted">Stability over last 42 epochs</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Model quality</span>
          <strong>{(activeModelStats.accuracy * 100).toFixed(1)}%</strong>
          <span className="metric-delta">
            <Sparkles size={14} />
            Baseline benchmark
          </span>
        </article>
      </div>

      <div className="dashboard-grid refined-dashboard-grid">
        <article className="chart-card">
          <header className="chart-card-head">
            <strong>Learning curve</strong>
            <span>Loss and accuracy over time</span>
          </header>
          {recentHistory.length === 0 ? (
            <div className="chart-empty">Start training to populate the analytics timeline.</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={recentHistory}>
                <defs>
                  <linearGradient id="accuracyFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5b76fe" stopOpacity={0.26} />
                    <stop offset="95%" stopColor="#5b76fe" stopOpacity={0.03} />
                  </linearGradient>
                  <linearGradient id="lossFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff7a59" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#ff7a59" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e8ecf3" vertical={false} />
                <XAxis dataKey="epoch" tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" tickLine={false} axisLine={false} width={42} />
                <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} width={42} />
                <Tooltip />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="accuracy"
                  stroke="#5b76fe"
                  fill="url(#accuracyFill)"
                  strokeWidth={3}
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="loss"
                  stroke="#ff7a59"
                  fill="url(#lossFill)"
                  strokeWidth={2.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </article>

        <article className="chart-card">
          <header className="chart-card-head">
            <strong>Model benchmark</strong>
            <span>Accuracy comparison across architectures</span>
          </header>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={comparisonData} layout="vertical" margin={{ left: 6, right: 12 }}>
              <CartesianGrid stroke="#eef2f7" horizontal={false} />
              <XAxis type="number" tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={108} />
              <Tooltip />
              <Bar dataKey="accuracy" fill="#5b76fe" radius={[0, 12, 12, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </article>
      </div>
    </section>
  )
}
