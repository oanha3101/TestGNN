import type { GraphDataset, ModelType, TrainingJobEvent } from '../types/gnn'
import {
  API_WS_BASE,
  apiClient as api,
  extractErrorMessage,
  getAccessToken,
} from './client'

type StartTrainingInput = {
  model: ModelType
  datasetName: string
  customDataset?: Record<string, unknown>
}

type ApiTrainingRun = {
  id: number
  model_type: ModelType
  dataset_name: string
  status: 'queued' | 'running' | 'completed' | 'failed' | 'canceled'
  epoch_current: number
  epoch_total: number
  best_accuracy: number | null
  best_loss: number | null
}

const jobs = new Map<string, StartTrainingInput>()

export const listDatasets = async () => {
  try {
    const response = await api.get<string[]>('/datasets')
    return response.data
  } catch (error) {
    throw new Error(extractErrorMessage(error))
  }
}

export const getDefaultDataset = async (): Promise<GraphDataset> => {
  try {
    const response = await api.get<GraphDataset>('/datasets/default')
    return response.data
  } catch (error) {
    throw new Error(extractErrorMessage(error))
  }
}

export const uploadDatasetFile = async (file: File): Promise<GraphDataset> => {
  const text = await file.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Dataset file must be valid JSON.')
  }

  try {
    const response = await api.post<GraphDataset>('/datasets/validate', parsed)
    return response.data
  } catch (error) {
    throw new Error(extractErrorMessage(error))
  }
}

export const startTrainingJob = async (input: StartTrainingInput) => {
  try {
    const response = await api.post<ApiTrainingRun>('/training-runs', {
      model_type: input.model,
      dataset_name: input.datasetName,
      epoch_total: 200,
    })
    const jobId = String(response.data.id)
    jobs.set(jobId, input)
    return {
      jobId,
      status: 'QUEUED' as const,
      websocketUrl: null,
    }
  } catch (error) {
    throw new Error(extractErrorMessage(error))
  }
}

type JobSocketListener = (event: TrainingJobEvent) => void

/**
 * Client for the backend training run WebSocket.
 *
 * Wire protocol (see `backend/app/api/routes/ws.py`):
 *   - client connects to /api/v1/ws/training/{runId}?token=<JWT>
 *   - server sends {type: 'status', status} on subscribe + transitions
 *   - server sends {type: 'progress', epoch, epochs, loss, val_accuracy, ...}
 *     on each epoch
 *   - server sends {type: 'ping'} every ~30s for liveness
 *   - server closes when status becomes completed | failed | canceled
 *
 * Public API is intentionally identical to the old polling implementation so
 * the rest of the app keeps working: `.open()`, `.subscribe(listener)`,
 * `.close('canceled'?)`. Listeners receive a uniform `TrainingJobEvent`.
 */
export class TrainingRunSocket {
  private readonly listeners = new Set<JobSocketListener>()
  private socket: WebSocket | null = null
  private readonly runId: string
  private readonly customDataset: Record<string, unknown> | null
  private closedByClient = false
  private maxEpochs = 200
  // Track the last real progress so terminal events can carry truthful
  // metrics instead of zero placeholders (which would pollute the UI chart).
  private lastEpoch = 0
  private lastLoss = 0
  private lastAccuracy = 0
  private terminalEmitted = false

  constructor(runId: string) {
    this.runId = runId
    const record = jobs.get(runId)
    this.customDataset = record?.customDataset ?? null
  }

  private emitTerminal(status: 'completed' | 'failed' | 'canceled'): void {
    if (this.terminalEmitted) return
    this.terminalEmitted = true
    const payload: TrainingJobEvent = {
      type: 'done',
      epoch: this.lastEpoch,
      epochs: this.maxEpochs,
      loss: this.lastLoss,
      accuracy: this.lastAccuracy,
      status,
    }
    for (const listener of this.listeners) listener(payload)
  }

  /**
   * Kicks off training on the backend (POST /training-runs/{id}/start) and
   * opens the WebSocket for live progress. Both are idempotent.
   */
  async open(): Promise<void> {
    if (this.socket !== null) return
    try {
      await api.post(`/training-runs/${Number(this.runId)}/start`, {
        epochs: this.maxEpochs,
        hidden_dim: 32,
        custom_dataset: this.customDataset ?? undefined,
      })
    } catch (error) {
      // The run may already be running from a previous page load — surface
      // other errors via a terminal failed event so the UI unblocks without
      // misreporting success.
      const message = extractErrorMessage(error)
      this.emitTerminal('failed')
      console.warn('training start failed', message)
      return
    }

    const token = getAccessToken()
    const url = `${API_WS_BASE}/ws/training/${Number(this.runId)}${
      token ? `?token=${encodeURIComponent(token)}` : ''
    }`
    const socket = new WebSocket(url)
    this.socket = socket

    socket.addEventListener('message', (event) => {
      this.handleMessage(event.data)
    })
    socket.addEventListener('close', () => {
      if (!this.closedByClient) {
        // Socket dropped before a terminal status frame arrived — treat it as
        // a failure so listeners can unblock without claiming success.
        this.emitTerminal('failed')
      }
      this.socket = null
    })
    socket.addEventListener('error', (event) => {
      console.warn('training websocket error', event)
    })
  }

  subscribe(listener: JobSocketListener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  async close(finalStatus?: 'canceled'): Promise<void> {
    this.closedByClient = true
    if (finalStatus === 'canceled') {
      try {
        await api.post(`/training-runs/${Number(this.runId)}/cancel`)
      } catch {
        // best effort
      }
      this.emitTerminal('canceled')
    }
    if (this.socket !== null) {
      try {
        this.socket.close()
      } catch {
        // no-op
      }
      this.socket = null
    }
  }

  private handleMessage(raw: unknown): void {
    if (typeof raw !== 'string') return
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>
    } catch {
      return
    }
    const type = parsed.type

    if (type === 'progress') {
      const epoch = Number(parsed.epoch ?? 0)
      const epochs = Number(parsed.epochs ?? this.maxEpochs)
      this.maxEpochs = epochs
      const loss = Number(parsed.loss ?? 0)
      // prefer validation accuracy for display; fall back to train accuracy.
      const accuracy = Number(
        parsed.val_accuracy ?? parsed.train_accuracy ?? parsed.accuracy ?? 0,
      )
      const roundedLoss = Number(loss.toFixed(4))
      const roundedAccuracy = Number(accuracy.toFixed(4))
      this.lastEpoch = epoch
      this.lastLoss = roundedLoss
      this.lastAccuracy = roundedAccuracy
      const payload: TrainingJobEvent = {
        type: 'progress',
        epoch,
        epochs,
        loss: roundedLoss,
        accuracy: roundedAccuracy,
      }
      for (const listener of this.listeners) listener(payload)
      return
    }

    if (type === 'status') {
      const status = String(parsed.status ?? '')
      if (status === 'completed' || status === 'failed' || status === 'canceled') {
        this.emitTerminal(status)
      }
    }
    // 'ping' and 'status: running' are intentionally no-ops.
  }
}
