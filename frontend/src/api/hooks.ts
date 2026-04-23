import { useMutation, useQuery } from '@tanstack/react-query'
import {
  getDefaultDataset,
  listDatasets,
  startTrainingJob,
  uploadDatasetFile,
} from './phase1MockService'
import { fetchEmbeddings, fetchReport } from './mlService'
import type { ModelType } from '../types/gnn'

export const useDatasetListQuery = () => {
  return useQuery({
    queryKey: ['datasets'],
    queryFn: listDatasets,
  })
}

export const useDefaultDatasetQuery = () => {
  return useQuery({
    queryKey: ['default-dataset'],
    queryFn: getDefaultDataset,
  })
}

export const useUploadDatasetMutation = () => {
  return useMutation({
    mutationFn: (file: File) => uploadDatasetFile(file),
  })
}

export const useStartTrainingMutation = () => {
  return useMutation({
    mutationFn: (input: { model: ModelType; datasetName: string }) => startTrainingJob(input),
  })
}

/**
 * Fetch the 2D embedding produced by the ML engine after a run completes.
 * Disabled until `runId` is a positive number.
 */
export const useTrainingEmbeddingsQuery = (runId: number | null) => {
  return useQuery({
    queryKey: ['training-embeddings', runId],
    queryFn: () => fetchEmbeddings(runId as number),
    enabled: typeof runId === 'number' && runId > 0,
    staleTime: Infinity,
  })
}

export const useTrainingReportQuery = (runId: number | null) => {
  return useQuery({
    queryKey: ['training-report', runId],
    queryFn: () => fetchReport(runId as number),
    enabled: typeof runId === 'number' && runId > 0,
    staleTime: Infinity,
  })
}
