import { CirclePlay, PauseCircle, SlidersHorizontal, WandSparkles, Upload, Plus, Trash2, Link2 } from 'lucide-react'
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
  onUploadFile: (file: File) => void
  onToggleTraining: () => void
  isUploading: boolean
  isQueueing: boolean
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
  onUploadFile,
  onToggleTraining,
  isUploading,
  isQueueing,
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
  const setSelectedDataset = useModelStore((state) => state.setSelectedDataset)
  const setAutoRepredict = useModelStore((state) => state.setAutoRepredict)
  const datasetOptions = datasets.includes(selectedDataset)
    ? datasets
    : [...datasets, selectedDataset]

  return (
    <aside className="panel panel-left border-sentry-purple-border/50">
      <div className="flex items-center gap-2 mb-2">
        <SlidersHorizontal size={18} className="text-sentry-purple" />
        <h2 className="font-display font-bold uppercase tracking-tight text-lg">
          Experiment Control
        </h2>
      </div>
      <p className="panel-subtitle text-xs opacity-70 mb-6">Train, inspect, and animate graph behavior in real time.</p>

      <div className="field">
        <label htmlFor="dataset-select" className="uppercase tracking-widest font-bold text-[10px] opacity-60">Dataset</label>
        <select
          id="dataset-select"
          className="w-full mt-1 bg-white text-sentry-purple-darker border-sentry-purple-border rounded-md"
          value={selectedDataset}
          onChange={(event) => setSelectedDataset(event.target.value)}
        >
          {datasetOptions.map((dataset) => (
            <option key={dataset} value={dataset}>
              {dataset}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="upload-dataset" className="uppercase tracking-widest font-bold text-[10px] opacity-60 flex items-center gap-1">
          <Upload size={10} /> Upload Graph JSON
        </label>
        <input
          id="upload-dataset"
          type="file"
          className="mt-1 block w-full text-[10px] text-slate-400
            file:mr-4 file:py-1 file:px-4
            file:rounded-full file:border-0
            file:text-[10px] file:font-bold file:uppercase file:tracking-wider
            file:bg-sentry-purple-border/30 file:text-white
            hover:file:bg-sentry-purple-border/50"
          accept=".json,application/json"
          disabled={isUploading}
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (!file) return
            onUploadFile(file)
            event.currentTarget.value = ''
          }}
        />
        <p className="text-[10px] mt-1 opacity-50 italic">{uploadMessage}</p>
      </div>

      <div className="field">
        <label htmlFor="model-select" className="uppercase tracking-widest font-bold text-[10px] opacity-60">Model</label>
        <select
          id="model-select"
          className="w-full mt-1 bg-white text-sentry-purple-darker border-sentry-purple-border rounded-md"
          value={model}
          onChange={(event) => setModel(event.target.value as ModelType)}
        >
          <option value="GCN">GCN</option>
          <option value="GAT">GAT</option>
          <option value="GraphSAGE">GraphSAGE</option>
          <option value="GraphTransformer">GraphTransformer</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="layout-select" className="uppercase tracking-widest font-bold text-[10px] opacity-60">Layout</label>
        <select
          id="layout-select"
          className="w-full mt-1 bg-white text-sentry-purple-darker border-sentry-purple-border rounded-md"
          value={layoutAlgorithm}
          onChange={(event) => setLayoutAlgorithm(event.target.value as 'force' | 'circular' | 'hierarchical')}
        >
          <option value="force">Force Directed</option>
          <option value="circular">Circular</option>
          <option value="hierarchical">Hierarchical</option>
        </select>
      </div>

      <div className="field">
        <span className="uppercase tracking-widest font-bold text-[10px] opacity-60">Color Mode</span>
        <div className="chip-row mt-1">
          <button
            className={`${colorMode === 'predicted' ? 'chip-active' : ''} chip text-[10px] uppercase font-bold px-3 py-1`}
            onClick={() => setColorMode('predicted')}
          >
            Predicted
          </button>
          <button
            className={`${colorMode === 'groundtruth' ? 'chip-active' : ''} chip text-[10px] uppercase font-bold px-3 py-1`}
            onClick={() => setColorMode('groundtruth')}
          >
            Ground
          </button>
          <button
            className={`${colorMode === 'attention' ? 'chip-active' : ''} chip text-[10px] uppercase font-bold px-3 py-1`}
            onClick={() => setColorMode('attention')}
          >
            Attention
          </button>
        </div>
      </div>

      <div className="field">
        <span className="uppercase tracking-widest font-bold text-[10px] opacity-60">Projection</span>
        <div className="chip-row mt-1">
          <button
            className={`${selectedProjection === 'pca' ? 'chip-active' : ''} chip text-[10px] uppercase font-bold px-3 py-1`}
            onClick={() => setSelectedProjection('pca')}
          >
            PCA
          </button>
          <button
            className={`${selectedProjection === 'tsne' ? 'chip-active' : ''} chip text-[10px] uppercase font-bold px-3 py-1`}
            onClick={() => setSelectedProjection('tsne')}
          >
            t-SNE
          </button>
          <button
            className={`${selectedProjection === 'umap' ? 'chip-active' : ''} chip text-[10px] uppercase font-bold px-3 py-1`}
            onClick={() => setSelectedProjection('umap')}
          >
            UMAP
          </button>
        </div>
      </div>

      <div className="field">
        <label htmlFor="attention-head" className="uppercase tracking-widest font-bold text-[10px] opacity-60">Attention Head: {attentionHead}</label>
        <input
          id="attention-head"
          type="range"
          min={0}
          max={3}
          className="w-full accent-sentry-purple"
          value={attentionHead}
          onChange={(event) => setAttentionHead(Number(event.target.value))}
        />
      </div>

      <div className="field">
        <label htmlFor="class-filter" className="uppercase tracking-widest font-bold text-[10px] opacity-60">Class Filter</label>
        <select
          id="class-filter"
          className="w-full mt-1 bg-white text-sentry-purple-darker border-sentry-purple-border rounded-md"
          value={classFilter}
          onChange={(event) =>
            setClassFilter(event.target.value === 'all' ? 'all' : Number(event.target.value))
          }
        >
          <option value="all">All</option>
          <option value={0}>Class 0</option>
          <option value={1}>Class 1</option>
          <option value={2}>Class 2</option>
          <option value={3}>Class 3</option>
        </select>
      </div>

      <div className="field field-toggle mt-4 flex gap-2">
        <button
          className={`${showLabels ? 'toggle-active' : ''} toggle text-[10px] uppercase font-bold px-3 py-1.5`}
          onClick={() => setShowLabels(!showLabels)}
        >
          Labels
        </button>
        <button
          className={`${autoRepredict ? 'toggle-active' : ''} toggle text-[10px] uppercase font-bold px-3 py-1.5`}
          onClick={() => setAutoRepredict(!autoRepredict)}
        >
          Auto Predict
        </button>
      </div>

      <div className="field mt-6">
        <label htmlFor="message-step" className="uppercase tracking-widest font-bold text-[10px] opacity-60">
          Message Step ({messageStep + 1}/{messagePassingPhases.length})
        </label>
        <input
          id="message-step"
          type="range"
          min={0}
          max={messagePassingPhases.length - 1}
          className="w-full accent-sentry-lime"
          value={messageStep}
          onChange={(event) => setMessageStep(Number(event.target.value))}
        />
        <p className="text-[10px] mt-1 font-mono text-sentry-lime uppercase tracking-tighter">{messagePassingPhases[messageStep]}</p>
      </div>

      <div className="field flex justify-between items-center bg-sentry-purple-border/20 p-2 rounded-lg border border-sentry-purple-border/30">
        <span className="text-[10px] uppercase font-bold tracking-widest opacity-60">Auto Step</span>
        <button 
          className={`${autoPlay ? 'bg-sentry-lime text-sentry-purple-darker shadow-lg' : 'bg-white/10'} p-1.5 rounded-full transition-all`} 
          onClick={() => setAutoPlay(!autoPlay)}
        >
          <WandSparkles size={14} />
        </button>
      </div>

      <div className="field mt-4">
        <label htmlFor="speed-slider" className="uppercase tracking-widest font-bold text-[10px] opacity-60">Speed: {animationSpeed.toFixed(1)}x</label>
        <input
          id="speed-slider"
          type="range"
          min={0.5}
          max={4}
          step={0.1}
          className="w-full accent-sentry-coral"
          value={animationSpeed}
          onChange={(event) => setAnimationSpeed(Number(event.target.value))}
        />
      </div>

      <div className="field mt-6 p-3 bg-sentry-purple-darker/50 rounded-xl border border-sentry-purple-border/40">
        <span className="uppercase tracking-widest font-bold text-[10px] opacity-80 mb-2 block">Graph Engine</span>
        {temporalMode ? <p className="text-[9px] text-sentry-pink mb-2 uppercase font-bold italic">LOCKED: TEMPORAL MODE</p> : null}
        <div className="flex flex-wrap gap-2">
          <button type="button" className="chip flex items-center gap-1 text-[9px] uppercase font-bold" onClick={onAddNode} disabled={temporalMode}>
            <Plus size={10} /> Node
          </button>
          <button
            type="button"
            className="chip flex items-center gap-1 text-[9px] uppercase font-bold hover:bg-sentry-pink hover:text-white"
            onClick={onDeleteSelectedNodes}
            disabled={selectedNodeCount === 0 || temporalMode}
          >
            <Trash2 size={10} /> Delete
          </button>
          <button
            type="button"
            className="chip flex items-center gap-1 text-[9px] uppercase font-bold"
            onClick={onConnectSelectedNodes}
            disabled={selectedNodeCount < 2 || temporalMode}
          >
            <Link2 size={10} /> Link
          </button>
        </div>
      </div>

      <button className="cta mt-6 group transition-all duration-300" onClick={onToggleTraining} disabled={isQueueing && !isTraining}>
        {isTraining ? <PauseCircle size={18} className="group-hover:scale-110" /> : <CirclePlay size={18} className="group-hover:scale-110" />}
        <span className="ml-2">{isTraining ? 'Pause Training' : isQueueing ? 'Queueing...' : 'Initiate Training'}</span>
      </button>

      <div className="progress-block mt-4" aria-live="polite">
        <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest opacity-60 mb-1">
          <span>Neural Convergence</span>
          <span className="text-sentry-lime">{Math.round(trainingProgress)}%</span>
        </div>
        <div className="progress-bar h-1.5 bg-sentry-purple-darker rounded-full overflow-hidden">
          <div className="progress-value h-full bg-gradient-to-r from-sentry-purple to-sentry-lime transition-all duration-500 shadow-[0_0_10px_rgba(194,239,78,0.3)]" style={{ width: `${trainingProgress}%` }} />
        </div>
      </div>
    </aside>
  )
}
