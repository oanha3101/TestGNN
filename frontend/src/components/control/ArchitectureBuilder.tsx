import { Download, GripVertical, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { estimateArchitectureComplexity } from '../../api/phase3MockService'
import type { ArchitectureLayer, ArchitectureLayerType, ArchitectureSchema, ModelType } from '../../types/gnn'

type ArchitectureBuilderProps = {
  model: ModelType
  schema: ArchitectureSchema
  onChange: (next: ArchitectureSchema) => void
  onResetPreset: () => void
}

const availableLayers: ArchitectureLayerType[] = [
  'Input',
  'GCNConv',
  'GATConv',
  'SAGEConv',
  'GraphormerBlock',
  'GPSLayer',
  'Readout',
  'MLP',
]

const makeLayer = (type: ArchitectureLayerType): ArchitectureLayer => ({
  id: `${type.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  type,
  hiddenDim: type === 'Input' ? 128 : 256,
  heads: type === 'GATConv' || type === 'GraphormerBlock' || type === 'GPSLayer' ? 8 : 1,
  dropout: type === 'Input' ? 0 : 0.2,
  activation: type === 'GraphormerBlock' || type === 'GPSLayer' ? 'gelu' : 'relu',
  residual: type === 'GraphormerBlock' || type === 'GPSLayer',
})

const moveLayer = (layers: ArchitectureLayer[], sourceId: string, targetId: string) => {
  if (sourceId === targetId) return layers
  const sourceIndex = layers.findIndex((layer) => layer.id === sourceId)
  const targetIndex = layers.findIndex((layer) => layer.id === targetId)
  if (sourceIndex < 0 || targetIndex < 0) return layers

  const next = [...layers]
  const [sourceLayer] = next.splice(sourceIndex, 1)
  next.splice(targetIndex, 0, sourceLayer)
  return next
}

export function ArchitectureBuilder({
  model,
  schema,
  onChange,
  onResetPreset,
}: ArchitectureBuilderProps) {
  const [dragLayerId, setDragLayerId] = useState<string | null>(null)
  const [selectedLayerType, setSelectedLayerType] = useState<ArchitectureLayerType>('GCNConv')
  const complexity = useMemo(() => estimateArchitectureComplexity(schema.layers), [schema.layers])

  const updateLayer = (layerId: string, patch: Partial<ArchitectureLayer>) => {
    onChange({
      ...schema,
      layers: schema.layers.map((layer) => (layer.id === layerId ? { ...layer, ...patch } : layer)),
    })
  }

  const removeLayer = (layerId: string) => {
    onChange({
      ...schema,
      layers: schema.layers.filter((layer) => layer.id !== layerId),
    })
  }

  const addLayer = (type: ArchitectureLayerType) => {
    onChange({
      ...schema,
      layers: [...schema.layers, makeLayer(type)],
    })
  }

  const exportSchema = () => {
    const blob = new Blob([JSON.stringify(schema, null, 2)], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `architecture-${model.toLowerCase()}.json`
    anchor.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <section className="panel architecture-panel">
      <h2 className="panel-title">Custom Architecture Builder</h2>
      <p className="panel-subtitle">
        Build and reorder layer stacks for rapid model prototyping.
      </p>

      <div className="builder-actions">
        <select
          aria-label="Select layer type"
          value={selectedLayerType}
          onChange={(event) => setSelectedLayerType(event.target.value as ArchitectureLayerType)}
        >
          {availableLayers.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <button type="button" className="toggle toggle-active" onClick={() => addLayer(selectedLayerType)}>
          <Plus size={13} />
          Add Layer
        </button>
        <button type="button" className="toggle" onClick={onResetPreset}>
          <RotateCcw size={13} />
          Reset Preset
        </button>
        <button type="button" className="toggle" onClick={exportSchema}>
          <Download size={13} />
          Export JSON
        </button>
      </div>

      <div className="builder-metrics">
        <span>Depth: {complexity.depth}</span>
        <span>Params: {Math.round(complexity.estimatedParams / 1000)}k</span>
        <span>Compute: {complexity.computeCost}</span>
      </div>

      <div className="builder-list">
        {schema.layers.map((layer, index) => (
          <article
            key={layer.id}
            className="builder-layer"
            draggable
            onDragStart={() => setDragLayerId(layer.id)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (!dragLayerId) return
              onChange({
                ...schema,
                layers: moveLayer(schema.layers, dragLayerId, layer.id),
              })
              setDragLayerId(null)
            }}
          >
            <header>
              <strong>
                <GripVertical size={13} />
                {index + 1}. {layer.type}
              </strong>
              <button type="button" className="toggle" onClick={() => removeLayer(layer.id)}>
                <Trash2 size={13} />
                Remove
              </button>
            </header>

            <div className="builder-grid">
              <label>
                Hidden
                <input
                  type="number"
                  min={16}
                  max={1024}
                  step={16}
                  value={layer.hiddenDim}
                  onChange={(event) => updateLayer(layer.id, { hiddenDim: Number(event.target.value) })}
                />
              </label>
              <label>
                Heads
                <input
                  type="number"
                  min={1}
                  max={16}
                  value={layer.heads}
                  onChange={(event) => updateLayer(layer.id, { heads: Number(event.target.value) })}
                />
              </label>
              <label>
                Dropout
                <input
                  type="number"
                  min={0}
                  max={0.9}
                  step={0.05}
                  value={layer.dropout}
                  onChange={(event) => updateLayer(layer.id, { dropout: Number(event.target.value) })}
                />
              </label>
              <label>
                Activation
                <select
                  value={layer.activation}
                  onChange={(event) =>
                    updateLayer(layer.id, { activation: event.target.value as ArchitectureLayer['activation'] })
                  }
                >
                  <option value="relu">ReLU</option>
                  <option value="gelu">GELU</option>
                  <option value="elu">ELU</option>
                </select>
              </label>
            </div>

            <button
              type="button"
              className={layer.residual ? 'toggle toggle-active' : 'toggle'}
              onClick={() => updateLayer(layer.id, { residual: !layer.residual })}
            >
              Residual {layer.residual ? 'ON' : 'OFF'}
            </button>
          </article>
        ))}
      </div>

      <p className="phase-label">
        <Plus size={12} /> Drag layers to reorder execution flow.
      </p>
    </section>
  )
}
