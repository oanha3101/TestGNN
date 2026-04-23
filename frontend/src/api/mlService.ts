import { apiClient, extractErrorMessage } from './client'

/**
 * Thin REST wrappers for the ML-specific endpoints added in PR2.
 * The WebSocket side lives in `TrainingRunSocket`; these are for the
 * artifacts produced after a run completes.
 */

export type EmbeddingPayload = {
  /** PCA-projected 2D coordinates, length == number of nodes */
  embedding_2d: [number, number][]
  /** predicted class label per node (argmax over logits) */
  predictions: number[]
}

export type ReportPayload = {
  best_accuracy: number
  best_loss: number
  final_epoch: number
  elapsed_seconds: number
  /** Only present for GAT runs. */
  attention?: {
    edge_index: [number[], number[]]
    weights: number[]
  }
}

export type ExplainPayload = {
  node_index: number
  predicted_class: number
  node_mask: number[][]
  edge_mask: number[]
  edge_index: [number[], number[]]
}

export const fetchEmbeddings = async (runId: number): Promise<EmbeddingPayload> => {
  try {
    const response = await apiClient.get<EmbeddingPayload>(
      `/training-runs/${runId}/embeddings`,
    )
    return response.data
  } catch (error) {
    throw new Error(extractErrorMessage(error))
  }
}

export const fetchReport = async (runId: number): Promise<ReportPayload> => {
  try {
    const response = await apiClient.get<ReportPayload>(
      `/training-runs/${runId}/report`,
    )
    return response.data
  } catch (error) {
    throw new Error(extractErrorMessage(error))
  }
}

export const explainNode = async (
  runId: number,
  nodeIndex: number,
  customDataset?: Record<string, unknown>,
): Promise<ExplainPayload> => {
  try {
    const response = await apiClient.post<ExplainPayload>(
      `/training-runs/${runId}/explain`,
      {
        node_index: nodeIndex,
        custom_dataset: customDataset ?? undefined,
      },
    )
    return response.data
  } catch (error) {
    throw new Error(extractErrorMessage(error))
  }
}
