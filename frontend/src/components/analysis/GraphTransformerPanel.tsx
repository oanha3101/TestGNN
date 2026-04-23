import { Atom, Cpu } from 'lucide-react'
import type { GraphTransformerConfig, ModelType } from '../../types/gnn'

type GraphTransformerPanelProps = {
  model: ModelType
  config: GraphTransformerConfig
  onChange: (next: GraphTransformerConfig) => void
}

const toK = (value: number) => `${Math.round(value / 1000)}k`

export function GraphTransformerPanel({ model, config, onChange }: GraphTransformerPanelProps) {
  const isActive = model === 'GraphTransformer'
  const estimatedParams = config.layers * config.hiddenDim * config.heads * 24

  return (
    <section className="panel transformer-panel">
      <h2 className="panel-title">
        <Atom size={18} />
        Graph Transformer
      </h2>
      <p className="panel-subtitle">
        Tune transformer-specific controls for Graphormer and GPS-style experiments.
      </p>

      {!isActive ? (
        <div className="empty-state">
          <Cpu size={20} />
          <p>Switch model to GraphTransformer to enable these settings.</p>
        </div>
      ) : null}

      <div className="field">
        <label htmlFor="transformer-variant">Variant</label>
        <select
          id="transformer-variant"
          value={config.variant}
          disabled={!isActive}
          onChange={(event) =>
            onChange({ ...config, variant: event.target.value as GraphTransformerConfig['variant'] })
          }
        >
          <option value="Graphormer">Graphormer</option>
          <option value="GPS">GPS</option>
          <option value="SAN">SAN</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="transformer-positional">Positional Encoding</label>
        <select
          id="transformer-positional"
          value={config.positionalEncoding}
          disabled={!isActive}
          onChange={(event) =>
            onChange({
              ...config,
              positionalEncoding: event.target.value as GraphTransformerConfig['positionalEncoding'],
            })
          }
        >
          <option value="laplacian">Laplacian Eigenvectors</option>
          <option value="rwse">Random Walk Structural Encoding</option>
          <option value="none">None</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="transformer-layers">Layers: {config.layers}</label>
        <input
          id="transformer-layers"
          type="range"
          min={2}
          max={12}
          value={config.layers}
          disabled={!isActive}
          onChange={(event) => onChange({ ...config, layers: Number(event.target.value) })}
        />
      </div>

      <div className="field">
        <label htmlFor="transformer-heads">Heads: {config.heads}</label>
        <input
          id="transformer-heads"
          type="range"
          min={2}
          max={16}
          step={2}
          value={config.heads}
          disabled={!isActive}
          onChange={(event) => onChange({ ...config, heads: Number(event.target.value) })}
        />
      </div>

      <div className="field">
        <label htmlFor="transformer-hidden">Hidden Dim</label>
        <select
          id="transformer-hidden"
          value={config.hiddenDim}
          disabled={!isActive}
          onChange={(event) => onChange({ ...config, hiddenDim: Number(event.target.value) })}
        >
          <option value={128}>128</option>
          <option value={256}>256</option>
          <option value={384}>384</option>
          <option value={512}>512</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="transformer-dropout">Dropout: {config.dropout.toFixed(2)}</label>
        <input
          id="transformer-dropout"
          type="range"
          min={0}
          max={0.6}
          step={0.05}
          value={config.dropout}
          disabled={!isActive}
          onChange={(event) => onChange({ ...config, dropout: Number(event.target.value) })}
        />
      </div>

      <div className="field field-toggle">
        <button
          type="button"
          className={config.useGlobalToken ? 'toggle toggle-active' : 'toggle'}
          disabled={!isActive}
          onClick={() => onChange({ ...config, useGlobalToken: !config.useGlobalToken })}
        >
          {config.useGlobalToken ? 'Global Token ON' : 'Global Token OFF'}
        </button>
      </div>

      <div className="transformer-estimate">
        <span>Estimated Params</span>
        <strong>{toK(estimatedParams)}</strong>
      </div>
    </section>
  )
}
