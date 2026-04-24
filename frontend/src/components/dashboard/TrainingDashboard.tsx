import { Activity, Gauge, Sparkles, TrendingUp } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useMemo } from 'react'
import { useModelStore } from '../../store/useStore'
import type { ModelType, TrainingPoint } from '../../types/gnn'

type TrainingDashboardProps = {
  model: ModelType
  trainingHistory: TrainingPoint[]
}

const modelDescriptions: Record<ModelType, string> = {
  GCN: 'Spectral baseline for compact graph classification experiments.',
  GAT: 'Attention-based aggregation for edge-sensitive neighborhood weighting.',
  GraphSAGE: 'Inductive neighborhood aggregator for scalable sampling workflows.',
  GraphTransformer: 'Transformer-style graph encoder with global structural context.',
}

export function TrainingDashboard({ model, trainingHistory }: TrainingDashboardProps) {
  const currentEpoch = useModelStore((state) => state.currentEpoch)
  const isTraining = useModelStore((state) => state.isTraining)
  // Memoise the slice so its identity is stable — React Compiler refuses
  // to preserve manual useMemo dependencies whose source may be mutated
  // (a fresh `.slice(...)` on every render qualifies as "unstable").
  const recentHistory = useMemo(
    () => trainingHistory.slice(Math.max(0, trainingHistory.length - 42)),
    [trainingHistory],
  )
  const lastPoint = recentHistory[recentHistory.length - 1]

  const bestAccuracy = useMemo(() => {
    if (recentHistory.length === 0) return null
    return Math.max(...recentHistory.map((item) => item.accuracy))
  }, [recentHistory])

  const bestLoss = useMemo(() => {
    if (recentHistory.length === 0) return null
    return Math.min(...recentHistory.map((item) => item.loss))
  }, [recentHistory])

  const recentCheckpoints = useMemo(() => recentHistory.slice(-5).reverse(), [recentHistory])

  return (
    <section className="dashboard-card training-dashboard-card">
      <div className="dashboard-head">
        <div>
          <h3 className="dashboard-title">
            <Activity size={18} />
            Training Analytics
          </h3>
          <p className="dashboard-copy">{modelDescriptions[model]}</p>
        </div>
        <span className="dashboard-badge">{model}</span>
      </div>

      <div className="metric-strip">
        <article className="metric-card">
          <span className="metric-label">Status</span>
          <strong>{isTraining ? 'Running' : recentHistory.length > 0 ? 'Ready' : 'Idle'}</strong>
          <span className="metric-delta">
            <Gauge size={14} />
            {isTraining ? 'Live updates enabled' : 'Waiting for the next run'}
          </span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Tracked epochs</span>
          <strong>{currentEpoch}</strong>
          <span className="metric-delta muted">Stored in the current session</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Best accuracy</span>
          <strong>{bestAccuracy !== null ? `${bestAccuracy.toFixed(1)}%` : '--'}</strong>
          <span className="metric-delta">
            <TrendingUp size={14} />
            Latest {lastPoint ? `${lastPoint.accuracy.toFixed(1)}%` : '--'}
          </span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Best loss</span>
          <strong>{bestLoss !== null ? bestLoss.toFixed(3) : '--'}</strong>
          <span className="metric-delta">
            <Sparkles size={14} />
            Last {lastPoint ? lastPoint.loss.toFixed(3) : '--'}
          </span>
        </article>
      </div>

      <div className="dashboard-grid refined-dashboard-grid">
        <article className="chart-card">
          <header className="chart-card-head">
            <strong>Learning curve</strong>
            <span>Accuracy and loss from the current run history</span>
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
            <strong>Recent checkpoints</strong>
            <span>Latest metric snapshots without synthetic benchmark data</span>
          </header>
          {recentCheckpoints.length === 0 ? (
            <div className="chart-empty">No checkpoints yet. Run training to see metric history.</div>
          ) : (
            <div className="checkpoint-list">
              {recentCheckpoints.map((point) => (
                <article key={point.epoch} className="checkpoint-item">
                  <div>
                    <strong>Epoch {point.epoch}</strong>
                    <p>
                      Accuracy {point.accuracy.toFixed(1)}% | Loss {point.loss.toFixed(3)}
                    </p>
                  </div>
                  <span>{point.accuracy.toFixed(1)}%</span>
                </article>
              ))}
            </div>
          )}
        </article>
      </div>
    </section>
  )
}
