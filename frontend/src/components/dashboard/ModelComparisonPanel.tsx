import { Layers3, Scale } from 'lucide-react'
import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useGraphStore } from '../../store/useStore'

const classPalette = ['#5b76fe', '#18c29c', '#ff996d', '#f26b8a']

export function ModelComparisonPanel() {
  const nodes = useGraphStore((state) => state.nodes)
  const edges = useGraphStore((state) => state.edges)

  const classDistribution = useMemo(() => {
    const counts = new Map<number, number>()
    for (const node of nodes) {
      counts.set(node.label, (counts.get(node.label) ?? 0) + 1)
    }

    return [...counts.entries()]
      .sort((left, right) => left[0] - right[0])
      .map(([label, value], index) => ({
        label: `Class ${label}`,
        value,
        color: classPalette[index % classPalette.length],
      }))
  }, [nodes])

  const degreeLeaders = useMemo(
    () =>
      [...nodes]
        .sort((left, right) => right.degree - left.degree)
        .slice(0, 6)
        .map((node) => ({
          label: node.id,
          value: node.degree,
        })),
    [nodes],
  )

  const density = useMemo(() => {
    const nodeCount = nodes.length
    if (nodeCount < 2) return 0
    const maxEdges = (nodeCount * (nodeCount - 1)) / 2
    return edges.length / maxEdges
  }, [edges.length, nodes.length])

  const averageDegree = useMemo(() => {
    if (nodes.length === 0) return 0
    return nodes.reduce((sum, node) => sum + node.degree, 0) / nodes.length
  }, [nodes])

  return (
    <section className="panel comparison-panel">
      <div className="social-panel-head">
        <div>
          <h2 className="panel-title">
            <Layers3 size={18} />
            Graph Insights
          </h2>
          <p className="panel-subtitle">Live graph health metrics derived from the currently loaded dataset.</p>
        </div>
        <div className="topbar-chip">
          <Scale size={12} />
          {nodes.length} visible nodes
        </div>
      </div>

      <div className="metric-strip">
        <article className="metric-card">
          <span className="metric-label">Nodes</span>
          <strong>{nodes.length}</strong>
          <span className="metric-delta muted">Current graph size</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Edges</span>
          <strong>{edges.length}</strong>
          <span className="metric-delta muted">Connections in view</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Average degree</span>
          <strong>{averageDegree.toFixed(1)}</strong>
          <span className="metric-delta muted">Mean neighborhood size</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Density</span>
          <strong>{(density * 100).toFixed(1)}%</strong>
          <span className="metric-delta muted">Undirected graph density</span>
        </article>
      </div>

      <div className="dashboard-grid comparison-dashboard-grid">
        <article className="chart-card">
          <header className="chart-card-head">
            <strong>Class distribution</strong>
            <span>Observed labels in the active graph</span>
          </header>
          {classDistribution.length === 0 ? (
            <div className="chart-empty">No labeled nodes are available.</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={classDistribution} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#eef2f7" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={44} />
                <Tooltip />
                <Bar dataKey="value" radius={[12, 12, 0, 0]}>
                  {classDistribution.map((item) => (
                    <Cell key={item.label} fill={item.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </article>

        <article className="chart-card">
          <header className="chart-card-head">
            <strong>Degree leaders</strong>
            <span>Most connected nodes right now</span>
          </header>
          <div className="checkpoint-list">
            {degreeLeaders.length === 0 ? (
              <div className="chart-empty">No nodes available.</div>
            ) : (
              degreeLeaders.map((node, index) => (
                <article key={node.label} className="checkpoint-item">
                  <div>
                    <strong>
                      {index + 1}. {node.label}
                    </strong>
                    <p>Degree {node.value}</p>
                  </div>
                  <span>{node.value}</span>
                </article>
              ))
            )}
          </div>
        </article>
      </div>
    </section>
  )
}
