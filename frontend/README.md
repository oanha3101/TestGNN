# GNN-VP Frontend (Phase 1 MVP)

Frontend MVP for Phase 1 in `read.md`:

- Upload and parse graph dataset (`.json`)
- Start/pause training job with realtime progress stream (WebSocket-like mock)
- Sigma.js graph visualization with selectable layouts
- Node coloring + node detail inspector
- Realtime Loss/Accuracy chart
- 2D embedding projection viewer (`PCA`, `t-SNE-like`, `UMAP-like`)

## Run

```bash
npm install
npm run dev
```

## Build & Lint

```bash
npm run build
npm run lint
```

## Custom Dataset JSON (minimum schema)

```json
{
  "name": "Custom Graph",
  "directed": false,
  "nodes": [
    { "id": "v0", "label": 0, "features": [0.1, 0.2, 0.3], "display": { "x": 10, "y": 20 } },
    { "id": "v1", "label": 1, "features": [0.3, 0.4, 0.5], "display": { "x": 30, "y": 40 } }
  ],
  "edges": [
    { "id": "e0", "source": "v0", "target": "v1", "weight": 1.0 }
  ]
}
```
