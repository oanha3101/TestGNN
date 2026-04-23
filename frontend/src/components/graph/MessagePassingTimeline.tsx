import { ChevronLeft, ChevronRight, Network, Pause, Play } from 'lucide-react'
import { messagePassingPhases } from '../../data/mockGnn'

type MessagePassingTimelineProps = {
  step: number
  setStep: (step: number) => void
  autoPlay: boolean
  setAutoPlay: (value: boolean) => void
  animationSpeed: number
}

export function MessagePassingTimeline({
  step,
  setStep,
  autoPlay,
  setAutoPlay,
  animationSpeed,
}: MessagePassingTimelineProps) {
  const canGoBack = step > 0
  const canGoNext = step < messagePassingPhases.length - 1

  return (
    <section className="timeline-card">
      <div className="timeline-head">
        <h3>
          <Network size={16} />
          Message Passing
        </h3>
        <span>
          Step {step + 1}/{messagePassingPhases.length}
        </span>
      </div>

      <div className="timeline-row" role="list" aria-label="Message passing phases">
        {messagePassingPhases.map((phase, index) => (
          <button
            key={phase}
            type="button"
            role="listitem"
            className={index === step ? 'phase-chip phase-chip-active' : 'phase-chip'}
            onClick={() => setStep(index)}
          >
            {phase}
          </button>
        ))}
      </div>

      <div className="timeline-actions">
        <button type="button" onClick={() => canGoBack && setStep(step - 1)} disabled={!canGoBack}>
          <ChevronLeft size={14} />
          Previous
        </button>
        <button type="button" onClick={() => setAutoPlay(!autoPlay)}>
          {autoPlay ? <Pause size={14} /> : <Play size={14} />}
          {autoPlay ? 'Pause' : 'Play'}
        </button>
        <button type="button" onClick={() => canGoNext && setStep(step + 1)} disabled={!canGoNext}>
          Next
          <ChevronRight size={14} />
        </button>
      </div>

      <p className="timeline-speed">Playback speed: {animationSpeed.toFixed(1)}x</p>
    </section>
  )
}
