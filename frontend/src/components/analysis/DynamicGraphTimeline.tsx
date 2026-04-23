import { Clock3, PauseCircle, PlayCircle } from 'lucide-react'
import type { TemporalSnapshot } from '../../types/gnn'

type DynamicGraphTimelineProps = {
  enabled: boolean
  onEnabledChange: (value: boolean) => void
  step: number
  onStepChange: (value: number) => void
  autoPlay: boolean
  onAutoPlayChange: (value: boolean) => void
  snapshots: TemporalSnapshot[]
}

export function DynamicGraphTimeline({
  enabled,
  onEnabledChange,
  step,
  onStepChange,
  autoPlay,
  onAutoPlayChange,
  snapshots,
}: DynamicGraphTimelineProps) {
  const maxStep = Math.max(0, snapshots.length - 1)
  const activeSnapshot = snapshots[step]
  const sliderStep = Math.min(step, maxStep)

  return (
    <section className="timeline-card dynamic-timeline">
      <div className="timeline-head">
        <h3>
          <Clock3 size={15} />
          Dynamic Graph Timeline
        </h3>
        <span>{activeSnapshot ? activeSnapshot.label : 'No snapshots'}</span>
      </div>

      <p className="panel-subtitle">
        Temporal mode simulates graph evolution across research checkpoints.
      </p>

      <div className="field field-toggle">
        <button
          type="button"
          className={enabled ? 'toggle toggle-active' : 'toggle'}
          onClick={() => onEnabledChange(!enabled)}
        >
          {enabled ? 'Temporal Mode: ON' : 'Temporal Mode: OFF'}
        </button>
        <button
          type="button"
          className={autoPlay ? 'toggle toggle-active' : 'toggle'}
          onClick={() => onAutoPlayChange(!autoPlay)}
          disabled={!enabled || maxStep === 0}
        >
          {autoPlay ? <PauseCircle size={14} /> : <PlayCircle size={14} />}
          {autoPlay ? 'Pause' : 'Auto Play'}
        </button>
      </div>

      <div className="field">
        <label htmlFor="dynamic-step">
          Snapshot {sliderStep + 1}/{maxStep + 1}
        </label>
        <input
          id="dynamic-step"
          type="range"
          min={0}
          max={maxStep}
          value={sliderStep}
          onChange={(event) => onStepChange(Number(event.target.value))}
          disabled={!enabled || maxStep === 0}
        />
      </div>

      {activeSnapshot ? (
        <div className="dynamic-metrics">
          <span>{activeSnapshot.nodes.length} nodes</span>
          <span>{activeSnapshot.edges.length} edges</span>
          <span>{new Date(activeSnapshot.timestamp).toLocaleTimeString()}</span>
        </div>
      ) : (
        <p className="phase-label">Generate or load a dataset to enable temporal snapshots.</p>
      )}
    </section>
  )
}
