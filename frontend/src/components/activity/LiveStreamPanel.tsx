import { RadioTower } from 'lucide-react'
import type { StreamEvent } from '../../types/gnn'

type LiveStreamPanelProps = {
  events: StreamEvent[]
}

const levelClassMap = {
  info: 'event-info',
  success: 'event-success',
  warn: 'event-warn',
}

const toClock = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function LiveStreamPanel({ events }: LiveStreamPanelProps) {
  return (
    <section className="panel stream-panel">
      <h2 className="panel-title">
        <RadioTower size={18} />
        Activity Stream
      </h2>
      <p className="panel-subtitle">Real workspace events from dataset loading, training, and explainability actions.</p>

      <div className="event-list">
        {events.length === 0 ? (
          <div className="empty-state">
            <p>No activity yet. Start by loading a dataset or launching training.</p>
          </div>
        ) : (
          events.map((event) => (
            <article key={event.id} className={`event-item ${levelClassMap[event.level]}`}>
              <div className="event-head">
                <span className="event-level">{event.level.toUpperCase()}</span>
                <time>{toClock(event.createdAt)}</time>
              </div>
              <p>{event.message}</p>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
