import { useMutation, useQuery } from '@tanstack/react-query'
import {
  getDatasetByName,
  getDefaultDataset,
  listTrainingRuns,
  listDatasets,
  startTrainingJob,
  uploadDatasetFile,
} from './phase1MockService'
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

export const useDatasetByNameQuery = (datasetName: string, enabled: boolean) => {
  return useQuery({
    queryKey: ['dataset', datasetName],
    queryFn: () => getDatasetByName(datasetName),
    enabled,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
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

export const useTrainingRunsQuery = (enabled: boolean) => {
  return useQuery({
    queryKey: ['training-runs'],
    queryFn: listTrainingRuns,
    enabled,
    refetchOnWindowFocus: false,
  })
}
