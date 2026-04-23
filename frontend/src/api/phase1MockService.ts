import axios from 'axios'
import type { GraphDataset, ModelType, TrainingJobEvent, TrainingRunRecord } from '../types/gnn'

type StartTrainingInput = {
  model: ModelType
  datasetName: string
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
  started_at?: string | null
  finished_at?: string | null
  created_at?: string
  user_id?: number
  metrics?: Array<{
    id: number
    epoch: number
    loss: number
    accuracy: number
    created_at: string
  }>
}

const TOKEN_KEY = 'gnnvp-access-token'

const normalizeBaseUrl = (rawBase: string) => {
  const trimmed = rawBase.replace(/\/+$/, '')
  return trimmed.endsWith('/api/v1') ? trimmed : `${trimmed}/api/v1`
}

const api = axios.create({
  baseURL: normalizeBaseUrl(import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'),
  timeout: 10000,
})

api.interceptors.request.use((config) => {
  const token = window.localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

const extractErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail
    if (typeof detail === 'string') return detail
    return error.message
  }
  return error instanceof Error ? error.message : 'Unknown error'
}

const runProfiles: Record<ModelType, { loss: number; accuracy: number }> = {
  GCN: { loss: 1.2, accuracy: 0.49 },
  GAT: { loss: 1.25, accuracy: 0.47 },
  GraphSAGE: { loss: 1.1, accuracy: 0.51 },
  GraphTransformer: { loss: 1.04, accuracy: 0.54 },
}

const jobs = new Map<string, StartTrainingInput>()

const nextTrainingMetrics = (model: ModelType, epoch: number) => {
  const profile = runProfiles[model]
  const loss = Math.max(0.09, profile.loss * Math.exp(-epoch / 35) + 0.03 * Math.sin(epoch / 8))
  const accuracy = Math.min(0.93, profile.accuracy + 0.44 * (1 - Math.exp(-epoch / 33)))
  return {
    loss: Number(loss.toFixed(4)),
    accuracy: Number(accuracy.toFixed(4)),
  }
}

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

export const getDatasetByName = async (datasetName: string): Promise<GraphDataset> => {
  try {
    const response = await api.get<GraphDataset>(`/datasets/${encodeURIComponent(datasetName)}`)
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

const toTrainingRunRecord = (run: ApiTrainingRun): TrainingRunRecord => ({
  id: String(run.id),
  userId: String(run.user_id ?? ''),
  modelType: run.model_type,
  datasetName: run.dataset_name,
  status: run.status,
  epochCurrent: run.epoch_current,
  epochTotal: run.epoch_total,
  bestAccuracy: run.best_accuracy === null ? null : Number((run.best_accuracy * 100).toFixed(2)),
  bestLoss: run.best_loss,
  createdAt: run.created_at ? new Date(run.created_at).getTime() : Date.now(),
  startedAt: run.started_at ? new Date(run.started_at).getTime() : null,
  finishedAt: run.finished_at ? new Date(run.finished_at).getTime() : null,
  metrics: (run.metrics ?? []).map((metric) => ({
    epoch: metric.epoch,
    loss: metric.loss,
    accuracy: Number((metric.accuracy * 100).toFixed(2)),
  })),
})

export const listTrainingRuns = async (): Promise<TrainingRunRecord[]> => {
  try {
    const response = await api.get<ApiTrainingRun[]>('/training-runs')
    return response.data.map(toTrainingRunRecord)
  } catch (error) {
    throw new Error(extractErrorMessage(error))
  }
}

const patchTrainingRun = async (
  runId: string,
  payload: {
    status?: ApiTrainingRun['status']
    epoch_current?: number
    epoch_total?: number
    best_accuracy?: number
    best_loss?: number
    metric?: {
      epoch: number
      loss: number
      accuracy: number
    }
  },
) => {
  await api.patch(`/training-runs/${Number(runId)}`, payload)
}

type JobSocketListener = (event: TrainingJobEvent) => void

export class TrainingRunSocket {
  private readonly listeners = new Set<JobSocketListener>()
  private timer: number | null = null
  private epoch = 0
  private readonly maxEpochs = 200
  private readonly runId: string
  private readonly model: ModelType

  constructor(runId: string) {
    this.runId = runId
    const record = jobs.get(runId)
    this.model = record?.model ?? 'GCN'
  }

  open() {
    if (this.timer !== null) return

    void patchTrainingRun(this.runId, {
      status: 'running',
      epoch_total: this.maxEpochs,
    }).catch(() => undefined)

    this.timer = window.setInterval(() => {
      void this.tick().catch(() => {
        void this.close('canceled')
      })
    }, 170)
  }

  subscribe(listener: JobSocketListener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  async close(finalStatus?: 'canceled') {
    if (this.timer !== null) {
      window.clearInterval(this.timer)
      this.timer = null
    }

    if (finalStatus === 'canceled') {
      await patchTrainingRun(this.runId, {
        status: 'canceled',
        epoch_current: this.epoch,
        epoch_total: this.maxEpochs,
      })
    }
  }

  private async tick() {
    this.epoch += 1
    const metrics = nextTrainingMetrics(this.model, this.epoch)
    const isDone = this.epoch >= this.maxEpochs

    await patchTrainingRun(this.runId, {
      status: isDone ? 'completed' : 'running',
      epoch_current: this.epoch,
      epoch_total: this.maxEpochs,
      best_accuracy: metrics.accuracy,
      best_loss: metrics.loss,
      metric: {
        epoch: this.epoch,
        loss: metrics.loss,
        accuracy: metrics.accuracy,
      },
    })

    const payload: TrainingJobEvent = {
      type: isDone ? 'done' : 'progress',
      epoch: this.epoch,
      epochs: this.maxEpochs,
      loss: metrics.loss,
      accuracy: metrics.accuracy,
    }

    for (const listener of this.listeners) listener(payload)

    if (isDone) {
      await this.close()
    }
  }
}
