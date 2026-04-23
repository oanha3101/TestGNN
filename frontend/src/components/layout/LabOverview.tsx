import { Activity, Database, GitBranch, Target } from 'lucide-react'

type LabOverviewProps = {
  selectedDataset: string
  model: string
  nodeCount: number
  edgeCount: number
  selectedNodeCount: number
  temporalMode: boolean
  isTraining: boolean
  currentEpoch: number
  currentTrainingRunId: string | null
  trainingProgress: number
}

export function LabOverview({
  selectedDataset,
  model,
  nodeCount,
  edgeCount,
  selectedNodeCount,
  temporalMode,
  isTraining,
  currentEpoch,
  currentTrainingRunId,
  trainingProgress,
}: LabOverviewProps) {
  const trainingLabel = isTraining
    ? 'Training in progress'
    : currentEpoch > 0
      ? 'Latest run retained'
      : 'No active run'

  const trainingCopy = isTraining
    ? `Epoch ${currentEpoch} running on ${model}.`
    : currentEpoch > 0
      ? `${currentEpoch} epochs tracked from the latest session.`
      : 'Start a run from the control rail to populate metrics.'

  return (
    <section className="lab-overview">
      <article className="lab-overview-card">
        <div className="lab-overview-icon">
          <Database size={18} />
        </div>
        <div>
          <span className="lab-overview-label">Dataset</span>
          <strong>{selectedDataset}</strong>
          <p>Loaded from the API dataset catalog or your uploaded JSON.</p>
        </div>
      </article>

      <article className="lab-overview-card">
        <div className="lab-overview-icon">
          <GitBranch size={18} />
        </div>
        <div>
          <span className="lab-overview-label">Graph Snapshot</span>
          <strong>
            {nodeCount} nodes and {edgeCount} edges
          </strong>
          <p>{temporalMode ? 'Temporal simulation is active.' : 'Static graph editing is active.'}</p>
        </div>
      </article>

      <article className="lab-overview-card">
        <div className="lab-overview-icon">
          <Activity size={18} />
        </div>
        <div>
          <span className="lab-overview-label">Training Status</span>
          <strong>{trainingLabel}</strong>
          <p>{trainingCopy}</p>
          {(isTraining || trainingProgress > 0) && (
            <div className="lab-overview-progress" aria-hidden="true">
              <span style={{ width: `${Math.max(6, trainingProgress)}%` }} />
            </div>
          )}
        </div>
      </article>

      <article className="lab-overview-card">
        <div className="lab-overview-icon">
          <Target size={18} />
        </div>
        <div>
          <span className="lab-overview-label">Selection</span>
          <strong>{selectedNodeCount > 0 ? `${selectedNodeCount} node(s) selected` : 'Nothing selected'}</strong>
          <p>{currentTrainingRunId ? `Run #${currentTrainingRunId}` : 'No training job linked yet.'}</p>
        </div>
      </article>
    </section>
  )
}
