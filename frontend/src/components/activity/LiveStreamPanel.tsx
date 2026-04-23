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
        Job Stream
      </h2>
      <p className="panel-subtitle">WebSocket-like event feed from training and inference pipeline.</p>

      <div className="event-list">
        {events.map((event) => (
          <article key={event.id} className={`event-item ${levelClassMap[event.level]}`}>
            <div className="event-head">
              <span className="event-level">{event.level.toUpperCase()}</span>
              <time>{toClock(event.createdAt)}</time>
            </div>
            <p>{event.message}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
