import {
  CirclePlay,
  Link2,
  PauseCircle,
  Plus,
  SlidersHorizontal,
  Trash2,
  Upload,
} from 'lucide-react'
import { messagePassingPhases } from '../../data/mockGnn'
import { useGraphStore, useModelStore } from '../../store/useStore'
import type { ModelType } from '../../types/gnn'

type ControlPanelProps = {
  model: ModelType
  setModel: (model: ModelType) => void
  messageStep: number
  setMessageStep: (step: number) => void
  autoPlay: boolean
  setAutoPlay: (value: boolean) => void
  animationSpeed: number
  setAnimationSpeed: (value: number) => void
  datasets: string[]
  uploadMessage: string
  onSelectDataset: (dataset: string) => void
  onUploadFile: (file: File) => void
  onToggleTraining: () => void
  isUploading: boolean
  isQueueing: boolean
  isDatasetLoading: boolean
  selectedNodeCount: number
  onAddNode: () => void
  onDeleteSelectedNodes: () => void
  onConnectSelectedNodes: () => void
  temporalMode: boolean
}

export function ControlPanel({
  model,
  setModel,
  messageStep,
  setMessageStep,
  autoPlay,
  setAutoPlay,
  animationSpeed,
  setAnimationSpeed,
  datasets,
  uploadMessage,
  onSelectDataset,
  onUploadFile,
  onToggleTraining,
  isUploading,
  isQueueing,
  isDatasetLoading,
  selectedNodeCount,
  onAddNode,
  onDeleteSelectedNodes,
  onConnectSelectedNodes,
  temporalMode,
}: ControlPanelProps) {
  const colorMode = useGraphStore((state) => state.colorMode)
  const layoutAlgorithm = useGraphStore((state) => state.layoutAlgorithm)
  const selectedProjection = useGraphStore((state) => state.selectedProjection)
  const attentionHead = useGraphStore((state) => state.attentionHead)
  const classFilter = useGraphStore((state) => state.classFilter)
  const showLabels = useGraphStore((state) => state.showLabels)
  const setColorMode = useGraphStore((state) => state.setColorMode)
  const setLayoutAlgorithm = useGraphStore((state) => state.setLayoutAlgorithm)
  const setSelectedProjection = useGraphStore((state) => state.setSelectedProjection)
  const setAttentionHead = useGraphStore((state) => state.setAttentionHead)
  const setClassFilter = useGraphStore((state) => state.setClassFilter)
  const setShowLabels = useGraphStore((state) => state.setShowLabels)

  const selectedDataset = useModelStore((state) => state.selectedDataset)
  const autoRepredict = useModelStore((state) => state.autoRepredict)
  const isTraining = useModelStore((state) => state.isTraining)
  const trainingProgress = useModelStore((state) => state.trainingProgress)
  const setAutoRepredict = useModelStore((state) => state.setAutoRepredict)

  const datasetOptions = datasets.includes(selectedDataset) ? datasets : [...datasets, selectedDataset]

  return (
    <aside className="panel panel-left control-panel">
      <div className="control-panel-head">
        <div>
          <h2 className="panel-title">
            <SlidersHorizontal size={18} />
            Experiment Control
          </h2>
          <p className="panel-subtitle">
            Keep dataset loading, training, playback, and graph editing in one clean control rail.
          </p>
        </div>
      </div>

      <section className="control-section">
        <div className="control-section-head">
          <span className="control-section-label">Data and Model</span>
          <p>Choose a dataset, upload custom JSON, and switch architecture.</p>
        </div>

        <div className="field">
          <label htmlFor="dataset-select">Dataset</label>
          <select
            id="dataset-select"
            value={selectedDataset}
            disabled={isDatasetLoading}
            onChange={(event) => onSelectDataset(event.target.value)}
          >
            {datasetOptions.map((dataset) => (
              <option key={dataset} value={dataset}>
                {dataset}
              </option>
            ))}
          </select>
          <p className="field-note">{isDatasetLoading ? 'Loading dataset graph...' : uploadMessage}</p>
        </div>

        <div className="field">
          <label htmlFor="upload-dataset">
            <Upload size={14} />
            Upload graph JSON
          </label>
          <input
            id="upload-dataset"
            type="file"
            accept=".json,application/json"
            disabled={isUploading}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (!file) return
              onUploadFile(file)
              event.currentTarget.value = ''
            }}
          />
        </div>

        <div className="field">
          <label htmlFor="model-select">Model</label>
          <select id="model-select" value={model} onChange={(event) => setModel(event.target.value as ModelType)}>
            <option value="GCN">GCN</option>
            <option value="GAT">GAT</option>
            <option value="GraphSAGE">GraphSAGE</option>
            <option value="GraphTransformer">GraphTransformer</option>
          </select>
        </div>
      </section>

      <section className="control-section control-section-training">
        <div className="control-section-head">
          <span className="control-section-label">Training Session</span>
          <p>Launch training from here instead of crowding the main navigation.</p>
        </div>

        <button type="button" className="cta control-training-button" onClick={onToggleTraining} disabled={isQueueing && !isTraining}>
          {isTraining ? <PauseCircle size={18} /> : <CirclePlay size={18} />}
          <span>{isTraining ? 'Pause training' : isQueueing ? 'Queueing run...' : 'Start training'}</span>
        </button>

        <div className="progress-block" aria-live="polite">
          <div className="control-progress-head">
            <span>Run progress</span>
            <strong>{Math.round(trainingProgress)}%</strong>
          </div>
          <div className="progress-bar">
            <div className="progress-value" style={{ width: `${trainingProgress}%` }} />
          </div>
        </div>
      </section>

      <section className="control-section">
        <div className="control-section-head">
          <span className="control-section-label">View and Filters</span>
          <p>Adjust projection, coloring, layout, and label visibility.</p>
        </div>

        <div className="field">
          <label htmlFor="layout-select">Layout</label>
          <select
            id="layout-select"
            value={layoutAlgorithm}
            onChange={(event) => setLayoutAlgorithm(event.target.value as 'force' | 'circular' | 'hierarchical')}
          >
            <option value="force">Force directed</option>
            <option value="circular">Circular</option>
            <option value="hierarchical">Hierarchical</option>
          </select>
        </div>

        <div className="field">
          <span>Color mode</span>
          <div className="chip-row">
            <button type="button" className={colorMode === 'predicted' ? 'chip chip-active' : 'chip'} onClick={() => setColorMode('predicted')}>
              Predicted
            </button>
            <button type="button" className={colorMode === 'groundtruth' ? 'chip chip-active' : 'chip'} onClick={() => setColorMode('groundtruth')}>
              Ground truth
            </button>
            <button type="button" className={colorMode === 'attention' ? 'chip chip-active' : 'chip'} onClick={() => setColorMode('attention')}>
              Attention
            </button>
          </div>
        </div>

        <div className="field">
          <span>Projection</span>
          <div className="chip-row">
            <button type="button" className={selectedProjection === 'pca' ? 'chip chip-active' : 'chip'} onClick={() => setSelectedProjection('pca')}>
              PCA
            </button>
            <button type="button" className={selectedProjection === 'tsne' ? 'chip chip-active' : 'chip'} onClick={() => setSelectedProjection('tsne')}>
              t-SNE
            </button>
            <button type="button" className={selectedProjection === 'umap' ? 'chip chip-active' : 'chip'} onClick={() => setSelectedProjection('umap')}>
              UMAP
            </button>
          </div>
        </div>

        <div className="field">
          <label htmlFor="attention-head">Attention head: {attentionHead}</label>
          <input
            id="attention-head"
            type="range"
            min={0}
            max={3}
            value={attentionHead}
            onChange={(event) => setAttentionHead(Number(event.target.value))}
          />
        </div>

        <div className="field">
          <label htmlFor="class-filter">Class filter</label>
          <select
            id="class-filter"
            value={classFilter}
            onChange={(event) => setClassFilter(event.target.value === 'all' ? 'all' : Number(event.target.value))}
          >
            <option value="all">All classes</option>
            <option value={0}>Class 0</option>
            <option value={1}>Class 1</option>
            <option value={2}>Class 2</option>
            <option value={3}>Class 3</option>
          </select>
        </div>

        <div className="chip-row">
          <button type="button" className={showLabels ? 'toggle toggle-active' : 'toggle'} onClick={() => setShowLabels(!showLabels)}>
            Labels
          </button>
          <button type="button" className={autoRepredict ? 'toggle toggle-active' : 'toggle'} onClick={() => setAutoRepredict(!autoRepredict)}>
            Auto predict
          </button>
        </div>
      </section>

      <section className="control-section">
        <div className="control-section-head">
          <span className="control-section-label">Graph Editing</span>
          <p>{temporalMode ? 'Temporal mode locks structural edits.' : 'Add nodes, remove selections, and create links.'}</p>
        </div>

        <div className="chip-row">
          <button type="button" className="chip" onClick={onAddNode} disabled={temporalMode}>
            <Plus size={12} />
            Add node
          </button>
          <button type="button" className="chip" onClick={onConnectSelectedNodes} disabled={selectedNodeCount < 2 || temporalMode}>
            <Link2 size={12} />
            Connect
          </button>
          <button type="button" className="chip danger-chip" onClick={onDeleteSelectedNodes} disabled={selectedNodeCount === 0 || temporalMode}>
            <Trash2 size={12} />
            Delete
          </button>
        </div>
      </section>

      <section className="control-section">
        <div className="control-section-head">
          <span className="control-section-label">Playback</span>
          <p>Step through message passing without oversized or wrapped controls.</p>
        </div>

        <div className="field">
          <label htmlFor="message-step">
            Message step {messageStep + 1}/{messagePassingPhases.length}
          </label>
          <input
            id="message-step"
            type="range"
            min={0}
            max={messagePassingPhases.length - 1}
            value={messageStep}
            onChange={(event) => setMessageStep(Number(event.target.value))}
          />
          <p className="field-note">{messagePassingPhases[messageStep]}</p>
        </div>

        <div className="chip-row">
          <button type="button" className={autoPlay ? 'toggle toggle-active' : 'toggle'} onClick={() => setAutoPlay(!autoPlay)}>
            {autoPlay ? 'Pause autoplay' : 'Enable autoplay'}
          </button>
        </div>

        <div className="field">
          <label htmlFor="speed-slider">Playback speed: {animationSpeed.toFixed(1)}x</label>
          <input
            id="speed-slider"
            type="range"
            min={0.5}
            max={4}
            step={0.1}
            value={animationSpeed}
            onChange={(event) => setAnimationSpeed(Number(event.target.value))}
          />
        </div>
      </section>
    </aside>
  )
}
