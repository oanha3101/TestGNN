import { Info, Sparkles, Target } from 'lucide-react'
import { useMemo } from 'react'
import { useGraphStore, useModelStore } from '../../store/useStore'
import type { ExplainerResult, ModelType } from '../../types/gnn'

type NodeDetailProps = {
  model: ModelType
  explanation: ExplainerResult | null
  explanationThreshold: number
  isExplaining: boolean
  onRunExplain: () => void
  onThresholdChange: (value: number) => void
}

const neighborsOf = (nodeId: string, edges: { source: string; target: string }[]) => {
  return edges
    .filter((edge) => edge.source === nodeId || edge.target === nodeId)
    .map((edge) => (edge.source === nodeId ? edge.target : edge.source))
}

export function NodeDetail({
  model,
  explanation,
  explanationThreshold,
  isExplaining,
  onRunExplain,
  onThresholdChange,
}: NodeDetailProps) {
  const nodes = useGraphStore((state) => state.nodes)
  const edges = useGraphStore((state) => state.edges)
  const selectedNodes = useGraphStore((state) => state.selectedNodes)
  const selectedProjection = useGraphStore((state) => state.selectedProjection)
  const attentionHead = useGraphStore((state) => state.attentionHead)
  const autoRepredict = useModelStore((state) => state.autoRepredict)
  const currentEpoch = useModelStore((state) => state.currentEpoch)
  const selectedNode = nodes.find((node) => node.id === selectedNodes[0])

  const filteredExplainerEdges = useMemo(() => {
    if (!selectedNode || !explanation || explanation.nodeId !== selectedNode.id) return []
    return explanation.importantEdges.filter((edge) => edge.importance >= explanationThreshold)
  }, [explanation, explanationThreshold, selectedNode])

  return (
    <aside className="panel panel-right">
      <h2 className="panel-title">
        <Info size={18} />
        Node Inspector
      </h2>

      {!selectedNode ? (
        <div className="empty-state">
          <Target size={20} />
          <p>Select one node from the graph to inspect features and explainability outputs.</p>
        </div>
      ) : (
        <div className="detail-grid">
          <div className="detail-line">
            <span>Node ID</span>
            <strong>{selectedNode.id}</strong>
          </div>
          <div className="detail-line">
            <span>Predicted Class</span>
            <strong>Class {selectedNode.label}</strong>
          </div>
          <div className="detail-line">
            <span>Confidence</span>
            <strong>{(selectedNode.confidence * 100).toFixed(1)}%</strong>
          </div>
          <div className="detail-line">
            <span>Degree</span>
            <strong>{selectedNode.degree}</strong>
          </div>
          <div className="detail-line">
            <span>Model</span>
            <strong>{model}</strong>
          </div>
          <div className="detail-line">
            <span>Projection</span>
            <strong>{selectedProjection.toUpperCase()}</strong>
          </div>
          <div className="detail-line">
            <span>Attention Head</span>
            <strong>#{attentionHead}</strong>
          </div>
          <div className="detail-line">
            <span>Auto Re-predict</span>
            <strong>{autoRepredict ? 'On' : 'Off'}</strong>
          </div>
          <div className="detail-line">
            <span>Latest Epoch</span>
            <strong>{currentEpoch}</strong>
          </div>

          <div className="detail-actions">
            <button type="button" className="toggle toggle-active" onClick={onRunExplain} disabled={isExplaining}>
              <Sparkles size={14} />
              {isExplaining ? 'Explaining...' : 'Explain This Node'}
            </button>
          </div>

          <div className="detail-block">
            <h3>Feature Vector</h3>
            <div className="feature-list">
              {selectedNode.features.map((feature, index) => (
                <div key={`${selectedNode.id}-f-${index}`} className="feature-item">
                  <label>f{index}</label>
                  <div className="feature-meter">
                    <span style={{ width: `${Math.max(4, feature * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="detail-block">
            <h3>GNNExplainer</h3>
            <label className="field-label" htmlFor="explainer-threshold">
              Edge Threshold: {explanationThreshold.toFixed(2)}
            </label>
            <input
              id="explainer-threshold"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={explanationThreshold}
              onChange={(event) => onThresholdChange(Number(event.target.value))}
            />

            {explanation && explanation.nodeId === selectedNode.id ? (
              <div className="explain-block">
                <p className="phase-label">Explanation score: {(explanation.score * 100).toFixed(1)}%</p>
                <div className="explain-list">
                  {filteredExplainerEdges.length === 0 ? (
                    <span className="phase-label">No edge above threshold.</span>
                  ) : (
                    filteredExplainerEdges.map((edge) => (
                      <span key={edge.edgeId}>
                        {edge.source} → {edge.target} ({Math.round(edge.importance * 100)}%)
                      </span>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <p className="phase-label">Run explainer to view influential subgraph.</p>
            )}
          </div>

          <div className="detail-block">
            <h3>Neighborhood</h3>
            <div className="neighbor-list">
              {neighborsOf(selectedNode.id, edges).map((neighbor) => (
                <span key={neighbor}>{neighbor}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
