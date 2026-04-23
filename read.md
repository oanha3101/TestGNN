# GNN Visualization Platform — Software Requirements Specification v1.0

> **Confidential — AI Build Document**

---

## Metadata

| Trường | Giá trị |
|---|---|
| Tên hệ thống | GNN Visualization Platform (GNN-VP) |
| Phiên bản | 1.0.0 |
| Ngày lập | 22/04/2026 |
| Trạng thái | Draft v1.0 — Sẵn sàng cho AI Build |
| Vai trò | Senior System Architect & AI Research Engineer |

---

## 1. TỔNG QUAN HỆ THỐNG

### 1.1 Mục tiêu Hệ thống

GNN-VP giải quyết khoảng cách giữa lý thuyết mô hình Graph Neural Network và khả năng hiểu, kiểm tra, phân tích của con người. Đây là công cụ nghiên cứu & giảng dạy chuyên dụng, cung cấp môi trường tương tác real-time để:

- Khả thị hóa cấu trúc đồ thị và quá trình Message Passing từng bước theo từng lớp GNN.
- Giải thích hành vi mô hình thông qua GNNExplainer, Attention Weights (GAT), và Embedding Projection.
- So sánh hiệu năng và hành vi giữa các kiến trúc GCN, GAT, GraphSAGE trên cùng dataset.
- Hỗ trợ chỉnh sửa đồ thị real-time và quan sát tức thì tác động lên kết quả dự đoán.
- Cung cấp môi trường thực nghiệm nhanh cho các nhà nghiên cứu AI và sinh viên tiến sĩ.

### 1.2 Use Cases Chính

| Use Case | Mô tả | Đối tượng | Độ ưu tiên |
|---|---|---|---|
| UC-01: Train & Monitor | Upload dataset, cấu hình siêu tham số, huấn luyện GNN, theo dõi loss/accuracy real-time | Researcher | P0 |
| UC-02: Graph Explore | Khám phá cấu trúc đồ thị, filter node/edge, zoom/pan, inspect đặc trưng node | Researcher / Educator | P0 |
| UC-03: Message Passing Anim | Xem hoạt hình từng bước message passing qua các lớp GNN | Educator / Student | P0 |
| UC-04: Attention Viz | Hiển thị trọng số attention của GAT dưới dạng độ dày/màu sắc cạnh | Researcher | P1 |
| UC-05: Embedding Projection | Chiếu embedding nút sang 2D/3D bằng PCA hoặc t-SNE, coloring theo label | Researcher | P1 |
| UC-06: Model Comparison | Chạy song song GCN/GAT/GraphSAGE, so sánh bảng metrics và visualization | Researcher | P1 |
| UC-07: GNNExplainer | Giải thích dự đoán của một nút cụ thể bằng subgraph quan trọng nhất | Researcher | P2 |
| UC-08: Graph Edit | Thêm/xóa nút và cạnh trực tiếp trên canvas, chạy lại inference ngay lập tức | Researcher / Educator | P2 |
| UC-09: Export Report | Xuất báo cáo PDF/HTML chứa kết quả experiments và visualization | Researcher | P2 |

### 1.3 Đối tượng Người dùng

| Nhóm người dùng | Vai trò | Nhu cầu chính | Kỹ năng kỹ thuật |
|---|---|---|---|
| AI Researcher | Nghiên cứu viên ML/AI | Phân tích model, debug, compare kiến trúc GNN | Cao (biết PyTorch) |
| PhD Student | Sinh viên tiến sĩ CNTT/Hóa | Học sâu GNN, thực nghiệm, viết luận | Trung bình–Cao |
| Educator / Lecturer | Giảng viên đại học | Demo trực quan cho sinh viên, tạo slide minh họa | Trung bình |
| ML Engineer | Kỹ sư ứng dụng GNN | Prototype nhanh, debug production model | Cao |
| Domain Scientist | Nhà khoa học Hóa/Sinh/Y | Phân tích mạng phân tử, tương tác protein | Thấp–Trung bình |

---

## 2. KIẾN TRÚC TỔNG THỂ

### 2.1 Mô hình Kiến trúc

Hệ thống áp dụng kiến trúc **3-tier**: `Frontend SPA → Backend REST/WebSocket API → ML Engine (Python)`. Sự phân tách này đảm bảo khả năng mở rộng độc lập từng lớp và tái sử dụng ML Engine cho nhiều client khác nhau.

### 2.2 Sơ đồ Kiến trúc

```
╔══════════════════════════════════════════════════════════════════════╗
║                     GNN-VP SYSTEM ARCHITECTURE                      ║
╠══════════════════════════════════════════════════════════════════════╣
║  BROWSER (React SPA)                                                ║
║  ┌─────────────────────────────────────────────────────────────┐   ║
║  │  GraphCanvas  │  ControlPanel  │  NodeDetail  │  Dashboard  │   ║
║  │  (Sigma.js)   │  (React Forms) │  (Inspector) │  (Recharts) │   ║
║  └────────────────────────┬────────────────────────────────────┘   ║
║                           │ REST / WebSocket                        ║
╠═══════════════════════════╪══════════════════════════════════════════╣
║  BACKEND (FastAPI + Celery)│                                        ║
║  ┌─────────────────────────▼─────────────────────────────────────┐ ║
║  │  API Gateway  ──→  Auth Middleware  ──→  Rate Limiter         │ ║
║  │       │                                                        │ ║
║  │  ┌────▼──────┐  ┌─────────┐  ┌──────────┐  ┌──────────────┐ │ ║
║  │  │ /train    │  │/predict │  │/embeddings│  │ /explain     │ │ ║
║  │  │ /graph    │  │/compare │  │/attention │  │ /graph/edit  │ │ ║
║  │  └─────┬─────┘  └────┬────┘  └─────┬────┘  └──────┬───────┘ │ ║
║  │        │              │              │               │          │ ║
║  │  Celery Task Queue (Redis)                                      │ ║
║  │  ┌────────────────────────────────────────────────────────┐  │ ║
║  │  │              ML ENGINE (PyTorch Geometric)             │  │ ║
║  │  │  GCN | GAT | GraphSAGE | GNNExplainer | PCA/t-SNE     │  │ ║
║  │  └──────────────────────────┬─────────────────────────────┘  │ ║
║  └─────────────────────────────┼──────────────────────────────────┘ ║
╠═════════════════════════════════╪════════════════════════════════════╣
║  STORAGE LAYER                  │                                    ║
║  ┌──────────────┐  ┌────────────▼────┐  ┌───────────────────────┐  ║
║  │ PostgreSQL   │  │  Redis Cache    │  │  MinIO (S3-compat)    │  ║
║  │ (metadata,   │  │  (jobs, session │  │  (model checkpoints,  │  ║
║  │  users, runs)│  │   embeddings)   │  │   datasets, reports)  │  ║
║  └──────────────┘  └─────────────────┘  └───────────────────────┘  ║
╚══════════════════════════════════════════════════════════════════════╝
```

### 2.3 Luồng Dữ liệu

#### 2.3.1 Luồng Training

1. User upload dataset (JSON/CSV) → Frontend gửi `POST /api/train`
2. Backend validate schema → tạo Celery Task → trả về `job_id` ngay lập tức
3. Celery worker load data → khởi tạo model GNN → chạy training loop
4. Mỗi epoch: worker gửi progress qua WebSocket (loss, accuracy, epoch)
5. Sau khi xong: lưu model checkpoint vào MinIO, metadata vào PostgreSQL
6. Frontend nhận signal `COMPLETED` → render charts + graph visualization

#### 2.3.2 Luồng Inference & Visualization

1. User chọn model + node → `POST /api/predict`
2. Backend load model từ MinIO cache → chạy forward pass
3. Trả về: predicted label, confidence score, embedding vector mỗi layer
4. Frontend render node colors theo predicted class, edge weights theo attention
5. User click node → WebSocket request → streaming embedding từng layer

---

## 3. THIẾT KẾ BACKEND

### 3.1 Công nghệ và Framework

| Component | Công nghệ | Phiên bản | Lý do chọn |
|---|---|---|---|
| Web Framework | FastAPI (Python) | 0.115+ | Async native, tự động Swagger/OpenAPI, type-safe Pydantic |
| Task Queue | Celery + Redis | 5.x + 7.x | Training là long-running job, cần async; Redis làm broker & result backend |
| Database | PostgreSQL | 16+ | ACID, JSON columns cho graph metadata, hỗ trợ pgvector cho embeddings |
| Cache / Pub-Sub | Redis | 7.x | Cache embeddings, pub-sub cho WebSocket progress, session store |
| Object Storage | MinIO (S3-compat) | RELEASE.2024+ | Self-hosted S3, lưu model checkpoint, datasets, export files |
| WebSocket | FastAPI WebSocket | native | Push training progress, real-time inference updates |
| Authentication | JWT + OAuth2 | python-jose | Stateless, tương thích với SSO nếu cần mở rộng |
| Containerization | Docker + Compose | 25+ | Đồng nhất môi trường dev/prod, dễ scale từng service |

### 3.2 Thiết kế API

#### 3.2.1 POST /api/train

Tạo một training job bất đồng bộ. Trả về `job_id` để client theo dõi qua WebSocket.

**Request Body:**
```json
{
  "model_type": "GCN | GAT | GraphSAGE",
  "dataset_id": "string (UUID)",
  "hyperparams": {
    "hidden_channels": 64,
    "num_layers": 2,
    "learning_rate": 0.01,
    "epochs": 200,
    "dropout": 0.5,
    "aggregation": "sum | mean | max",
    "num_heads": 8,
    "attention_dropout": 0.6
  },
  "task_type": "node_classification | graph_classification | link_prediction"
}
```

**Response (202 Accepted):**
```json
{
  "job_id": "uuid-v4",
  "status": "QUEUED",
  "websocket_url": "/ws/jobs/{job_id}"
}
```

#### 3.2.2 POST /api/predict

**Request Body:**
```json
{
  "model_id": "string (UUID)",
  "graph_data": {},
  "node_ids": ["v1", "v2"],
  "return_embeddings": true,
  "return_attention": true
}
```

**Response (200 OK):**
```json
{
  "predictions": [{"node_id": "v1", "label": 2, "confidence": 0.94}],
  "embeddings": {"layer_0": {}, "layer_1": {}, "final": {}},
  "attention_weights": {"layer_0": [{"src": "v1", "dst": "v2", "weight": 0.73}]}
}
```

#### 3.2.3 GET /api/embeddings/{model_id}

Trả về tất cả node embeddings để render Embedding Projector (PCA/t-SNE).

```json
{
  "model_id": "uuid",
  "projection": "pca | tsne | umap",
  "n_components": 2,
  "perplexity": 30
}
```

#### 3.2.4 POST /api/explain

Chạy GNNExplainer cho một nút cụ thể.

**Request Body:**
```json
{
  "model_id": "uuid",
  "node_id": "v42",
  "num_hops": 2,
  "explainer_epochs": 100,
  "edge_mask_threshold": 0.5
}
```

**Response:**
```json
{
  "important_edges": [{"src": "v1", "dst": "v42", "importance": 0.89}],
  "important_features": [{"feature_name": "degree", "importance": 0.76}],
  "explanation_subgraph": {}
}
```

#### 3.2.5 GET/POST /api/graph

CRUD operations cho dữ liệu đồ thị. Hỗ trợ upload (Cora, QM9, custom JSON), edit (thêm/xóa node/edge), và export.

### 3.3 JSON Schema — Graph Data Format

```json
{
  "graph_id": "uuid-v4",
  "name": "Cora Citation Network",
  "directed": false,
  "metadata": {"num_classes": 7, "task": "node_classification"},
  "nodes": [
    {
      "id": "v0",
      "label": 3,
      "features": [0.0, 1.0, 0.0],
      "display": {"x": 120.5, "y": 340.2, "color": "#2E86AB", "size": 8}
    }
  ],
  "edges": [
    {
      "id": "e0",
      "source": "v0",
      "target": "v1",
      "weight": 1.0,
      "type": "citation",
      "features": [0.5, 0.1]
    }
  ]
}
```

### 3.4 Xử lý Bất đồng bộ

| Giai đoạn | Cơ chế | Chi tiết |
|---|---|---|
| Nhận request | FastAPI async endpoint | Validate input → tạo job record trong PostgreSQL → enqueue vào Redis |
| Thực thi job | Celery Worker (GPU process) | Load data → build graph → training loop, cập nhật progress mỗi epoch |
| Streaming progress | WebSocket `/ws/jobs/{id}` | Worker publish message lên Redis channel → FastAPI WebSocket relay đến client |
| Kết quả | PostgreSQL + MinIO | Checkpoint model → MinIO; metrics history → PostgreSQL; cache embeddings → Redis |
| Hủy job | POST `/api/jobs/{id}/cancel` | Gửi SIGTERM đến Celery task, cleanup temp files, cập nhật status |

### 3.5 Scalability

- **Horizontal scaling** Celery workers: thêm worker node, chia queue theo model type (CPU / GPU queue).
- **Database connection pooling**: PgBouncer với `pool_size=20` cho production.
- **Redis Cluster mode** cho high availability trên production.
- **Model sharding**: mỗi model checkpoint lưu riêng trong MinIO, lazy-load khi inference.
- **API Rate limiting**: 100 req/min per user, 10 concurrent training jobs per instance.

---

## 4. THIẾT KẾ FRONTEND

### 4.1 Framework và Thư viện

| Thư viện | Phiên bản | Mục đích | Lý do chọn |
|---|---|---|---|
| React | 19+ | UI Framework | Component model phù hợp, ecosystem mạnh, Concurrent Mode cho smooth rendering |
| TypeScript | 5.x | Type Safety | Bắt lỗi compile-time, IDE support tốt cho large codebase |
| Sigma.js v3 | 3.x | Graph Rendering | WebGL-based, render 100k+ nodes mượt mà, custom shaders |
| Graphology | 0.26+ | Graph Data Model | Library quản lý graph data của Sigma.js, efficient neighbor queries |
| Recharts | 2.x | Charts/Metrics | Declarative, tích hợp tốt với React, responsive, customizable |
| Three.js | r128 | 3D Embedding Viz | Render embedding projection 3D, orbit controls, smooth animation |
| Zustand | 5.x | State Management | Lightweight hơn Redux, tốt cho graph state có nhiều mutations |
| React Query | 5.x | Server State | Caching, background refetch, optimistic updates cho API calls |
| Framer Motion | 11+ | Animation | Message passing animation, panel transitions, smooth UI |
| Tailwind CSS | 4.x | Styling | Utility-first, consistent design tokens, dark mode support |

### 4.2 Layout UI

```
┌─────────────────────────────────────────────────────────────────────┐
│  HEADER: GNN-VP  │  Dataset Selector  │  Model Selector  │  [User] │
├──────────────┬──────────────────────────────────────┬───────────────┤
│              │                                      │               │
│  CONTROL     │      GRAPH CANVAS (Sigma.js)         │  NODE DETAIL  │
│  PANEL       │                                      │  PANEL        │
│              │  [Zoom+/-] [Fit] [Filter]            │               │
│  ─ Model     │                                      │  Node ID: v42 │
│  ─ Layers    │      ●─────●                         │  Label: Class2│
│  ─ Dataset   │     /│      \                        │  Degree: 5    │
│  ─ Animation │    ● │   ●──●─●                      │               │
│  ─ Filter    │    │ │   │   │                        │  Features:    │
│  ─ ColorMap  │    ●─●───●   ●                       │  [0.1, 0.9,..]│
│              │                                      │               │
│  [Train]     │                                      │  Prediction:  │
│  [Predict]   │                                      │  Class 2 (94%)│
│  [Explain]   │                                      │               │
│  [Compare]   │                                      │  [Explain]    │
│              │                                      │  [Trace Msg]  │
├──────────────┴──────────────────────────────────────┴───────────────┤
│  ANALYTICS DASHBOARD:  Loss Curve | Accuracy | Confusion Matrix     │
│  [Training Progress Bar ████████████░░░░░░░░  78% Epoch 156/200]   │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.3 Mô tả Chi tiết từng Panel

#### 4.3.1 Graph Canvas (Trung tâm)

- **Thư viện**: Sigma.js v3 với WebGL renderer — đảm bảo render 50k+ nodes @ 60fps.
- **Interaction**: Pan (drag), Zoom (scroll/pinch), Click node (select), Drag node (reposition).
- **Hover state**: tooltip với `node_id`, label, degree ngay trên canvas.
- **Selection mode**: click single node → highlight + subgraph 2-hop; `shift+click` để multi-select.
- **Layout algorithms**: Force-directed (mặc định), Circular, Hierarchical (DAG), Random.
- **Performance**: Virtual rendering — chỉ render nodes/edges trong viewport, lazy load hidden.

#### 4.3.2 Control Panel (Trái)

- **Model Selector**: dropdown chọn GCN/GAT/GraphSAGE + load pretrained hoặc train mới.
- **Layer Selector**: slider chọn layer để visualize embedding tại layer đó (L0 → L_final).
- **Animation Controls**: Play/Pause/Step Forward/Step Back cho message passing animation.
- **Color Mode**: color by predicted class / ground truth / embedding cluster / attention intensity.
- **Filter Panel**: filter nodes theo degree (slider), label (checkbox), confidence (range).

#### 4.3.3 Node Detail Panel (Phải)

- **Metadata**: `node_id`, true label, predicted label, confidence score, degree.
- **Feature Vector**: bar chart mini hiển thị top-10 features theo magnitude.
- **Neighborhood**: list 5 láng giềng trực tiếp kèm link weight.
- **Embedding Timeline**: line chart showing embedding norm qua từng layer.
- **Action Buttons**: [Explain This Node], [Trace Message Passing], [Compare Predictions].

#### 4.3.4 Analytics Dashboard (Dưới)

- **Training Loss Curve**: real-time line chart cập nhật mỗi epoch qua WebSocket.
- **Train/Val Accuracy**: dual-line chart, hiển thị overfitting sớm.
- **Confusion Matrix**: heatmap interactive, click cell để filter nodes trên canvas.
- **MAD (Mean Average Distance)**: gauge chart để monitor over-smoothing theo layer.
- **Epoch Progress Bar**: animated progress với ETA.

### 4.4 State Management

Sử dụng Zustand với slice pattern:

```typescript
// store/graphStore.ts
interface GraphState {
  currentGraph: GraphData | null;
  selectedNodes: Set<string>;
  hoveredNode: string | null;
  colorMode: 'predicted' | 'groundtruth' | 'cluster' | 'attention';
  visibleLayers: number[];
  layoutAlgorithm: 'force' | 'circular' | 'hierarchical';
}

// store/modelStore.ts
interface ModelState {
  selectedModel: ModelConfig | null;
  trainingJob: TrainingJob | null;
  embeddings: Record<string, LayerEmbeddings>;
  attentionWeights: AttentionData | null;
  predictions: Record<string, Prediction>;
}
```

---

## 5. MACHINE LEARNING MODULE

### 5.1 Các Mô hình GNN

#### 5.1.1 Graph Convolutional Network (GCN)

**Công thức update:**
```
H(l+1) = σ( D^(-1/2) * A_hat * D^(-1/2) * H(l) * W(l) )
```
Trong đó `A_hat = A + I` (self-loop), `D` là degree matrix. GCN là baseline tiêu chuẩn, phù hợp cho transductive learning trên đồ thị tĩnh.

```python
# gnn/models/gcn.py
class GCNModel(nn.Module):
    def __init__(self, in_channels, hidden_channels, out_channels, num_layers, dropout):
        super().__init__()
        self.convs = nn.ModuleList()
        self.convs.append(GCNConv(in_channels, hidden_channels))
        for _ in range(num_layers - 2):
            self.convs.append(GCNConv(hidden_channels, hidden_channels))
        self.convs.append(GCNConv(hidden_channels, out_channels))
        self.dropout = dropout
        self.embeddings = {}  # capture per-layer embeddings

    def forward(self, x, edge_index):
        for i, conv in enumerate(self.convs[:-1]):
            x = conv(x, edge_index)
            x = F.relu(x)
            x = F.dropout(x, p=self.dropout, training=self.training)
            self.embeddings[f'layer_{i}'] = x.detach().cpu()
        x = self.convs[-1](x, edge_index)
        self.embeddings['final'] = x.detach().cpu()
        return x
```

#### 5.1.2 Graph Attention Network (GAT)

GAT học trọng số attention:
```
e_ij = LeakyReLU( a^T * [Wh_i || Wh_j] )
```
Sau đó softmax để tạo attention coefficients `α_ij`. Multi-head attention với K heads giúp ổn định quá trình học.

> 📌 **Lưu ý**: Trọng số attention `α_ij` chính là dữ liệu để render edge thickness/color trong Attention Visualization.

#### 5.1.3 GraphSAGE

GraphSAGE dùng **inductive learning**: thay vì học embedding cho từng nút cố định, nó học một aggregation function có thể áp dụng cho nút mới. Bước sampling (lấy mẫu k=10 láng giềng) là chìa khóa để mở rộng lên đồ thị tỉ nút.

### 5.2 Pipeline Chi tiết

| Bước | Mô tả | Class/Function | Output |
|---|---|---|---|
| 1. Load & Validate | Parse JSON schema, validate node/edge format, kiểm tra connectivity | `DataLoader.load()` | PyG Data object |
| 2. Feature Engineering | Chuẩn hóa features (StandardScaler), one-hot encoding labels, compute degree features | `FeatureProcessor.fit_transform()` | Normalized feature matrix X |
| 3. Graph Construction | Chuyển edge list → COO sparse format (edge_index), tính adjacency, thêm self-loops | `GraphBuilder.build()` | `edge_index` tensor [2, E] |
| 4. Split | Train/Val/Test split theo mask (60/20/20), hỗ trợ stratified split | `DataSplitter.split()` | `train_mask`, `val_mask`, `test_mask` |
| 5. Training Loop | Forward pass → loss computation → backward pass → optimizer step, lưu best model | `Trainer.train()` | Trained model, metrics history |
| 6. Evaluation | Accuracy, F1, ROC-AUC, Confusion Matrix trên test set | `Evaluator.evaluate()` | Metrics dict |
| 7. Export | Serialize model state_dict, config, metrics → MinIO | `ModelManager.save()` | `model_id`, `checkpoint_path` |

### 5.3 Lưu trữ Model và Embedding

```
# MinIO Object Structure
models/
  {model_id}/
    config.json          # hyperparams, architecture
    checkpoint.pt        # PyTorch state_dict
    embeddings/
      layer_0.npy        # numpy arrays, shape [N, hidden_dim]
      layer_1.npy
      final.npy
    metrics.json         # loss/acc history per epoch
    attention/           # GAT only
      layer_0_heads.npz  # sparse attention matrices

datasets/
  {dataset_id}/
    raw.json             # original upload
    processed.pt         # PyG Data object serialized
    metadata.json        # num_nodes, num_edges, num_classes
```

---

## 6. THIẾT KẾ VISUALIZATION

### 6.1 Biểu diễn Node

| Thuộc tính Visual | Nguồn dữ liệu | Mapping Logic | Range |
|---|---|---|---|
| Màu sắc (Color) | `predicted_label` / `ground_truth` | Categorical colormap (tab10 palette), mỗi class một màu cố định | 10 màu phân biệt |
| Kích thước (Size) | `degree` / `confidence score` | `size = base_size + k * log(degree+1)`; confidence → opacity | 4px–24px |
| Viền (Border) | Chọn / Hover / Explained | Mặc định: thin border; Selected: thick accent; Explained: pulsing orange | 1–4px |
| Opacity | `confidence` / `attention_received` | Thấp confidence → node mờ hơn; highlight selected neighbors | 0.3–1.0 |
| Nhãn (Label) | `node_id` / `class_name` | Chỉ hiển thị khi zoom đủ gần (level-of-detail rendering) | Auto |

### 6.2 Biểu diễn Edge

| Thuộc tính Visual | Nguồn dữ liệu | Mapping Logic |
|---|---|---|
| Độ dày (Width) | `edge_weight` / `attention_weight` | `width = 0.5 + 3.0 * attention`; normalized [0,1] |
| Màu sắc | `edge_type` / `attention_intensity` | Type → category color; Attention heat: xanh nhạt (0.0) → đỏ đậm (1.0) |
| Mũi tên (Arrow) | `directed` flag trong graph schema | Chỉ render arrow khi graph directed; animated particle flow cho active edges |
| Opacity | `is_in_explanation_subgraph` | Edges không thuộc explanation subgraph sẽ bị mờ khi đang ở Explain mode |
| Đường loại | `edge_type` | Solid = default; Dashed = weak connection; Dotted = inferred (link prediction) |

### 6.3 Message Passing Animation

Animation được thực hiện step-by-step theo quy trình **Gather → Aggregate → Update**:

#### Luồng Animation cho 1 Layer

| Phase | Mô tả | Thời gian |
|---|---|---|
| **GATHER** | Các cạnh từ neighbor → target node được highlight tuần tự. Animated particles chạy dọc edge từ source đến target. | 800ms per neighbor |
| **AGGREGATE** | Ring animation tại node target, biểu thị quá trình tổng hợp. Color gradient biến đổi từ màu cũ sang màu mới. | 600ms |
| **UPDATE** | Flash effect tại target node, size nhẹ tăng rồi giảm về. Tooltip hiển thị embedding vector trước/sau. | 400ms |
| **NEXT NODE** | Chuyển sang node tiếp theo trong batch. Controls: Speed slider (0.5x–4x), Skip to Layer, Pause/Resume. | — |

#### Implementation

```typescript
// frontend/components/animation/MessagePassingAnimator.ts
class MessagePassingAnimator {
  private sigma: Sigma;
  private frameData: AnimationFrame[];  // pre-computed từ backend
  private currentFrame: number = 0;

  async loadAnimationData(modelId: string, nodeId: string) {
    const frames = await api.get(`/api/animate/${modelId}/${nodeId}`);
    this.frameData = frames;
  }

  renderFrame(frameIndex: number) {
    const frame = this.frameData[frameIndex];
    this.sigma.getGraph().setNodeAttribute(frame.targetNode, 'color', frame.newColor);
    frame.activeEdges.forEach(e => {
      this.sigma.getGraph().setEdgeAttribute(e.id, 'size', e.weight * 3);
    });
    this.sigma.refresh();
  }
}
```

### 6.4 Attention Visualization (GAT)

- **Edge width** tỷ lệ với attention weight: `α_ij = 0.9` rộng gấp 9 lần so với `α_ij = 0.1`.
- **Color gradient**: Màu lạnh (xanh dương) cho attention thấp, màu nóng (đỏ/cam) cho attention cao.
- **Head Selector**: dropdown để chọn xem attention của head nào (GAT thường có 4–8 heads).
- **Heatmap mode**: overlay heatmap trực tiếp lên canvas, intensity = average attention across heads.

### 6.5 Embedding Projection

| Phương pháp | Đặc điểm | Thư viện |
|---|---|---|
| **PCA** | Nhanh, xác định, dùng cho monitoring và quick overview | `sklearn.PCA` với `n_components=2` |
| **t-SNE** | Chậm hơn nhưng bảo toàn cấu trúc local tốt hơn | scikit-learn (chạy trên backend) |
| **UMAP** | Cân bằng tốc độ và chất lượng, khuyến nghị cho production | `umap-learn` |

- **Render 2D**: scatter plot với Recharts, mỗi điểm là một node, color theo class.
- **Render 3D**: Three.js với orbit controls, interactive zoom/rotate.
- **Trajectory animation**: animate sự biến đổi của embeddings từ layer 0 → layer N (morphing dots).

---

## 7. CÁC CHỨC NĂNG CHÍNH

### 7.1 Graph Visualization Interactive

| Chức năng | Mô tả kỹ thuật | Thư viện |
|---|---|---|
| Pan & Zoom | MouseDrag + WheelEvent, smooth animation với `requestAnimationFrame` | Sigma.js built-in |
| Click Select | Click node → emit `'nodeSelected'` event → update Zustand store → Node Detail Panel | Sigma.js events |
| Multi-select | `Shift+Click` → accumulate `selectedNodes` Set, highlight cả nhóm | Zustand |
| Lasso Select | Click-drag trên empty space → select all nodes in bounding box | Custom Sigma plugin |
| Filter Nodes | Real-time filter theo label/degree/confidence → ẩn/hiện nodes mà không reload graph | Graphology + Sigma |
| Layout Switch | User chọn layout → chạy layout algorithm → smooth animate đến vị trí mới | graphology-layout-forceatlas2 |
| Search Node | Fuzzy search theo `node_id` hoặc label → fly camera đến node, highlight nó | Fuse.js + Sigma.js camera |

### 7.2 Model Comparison

Cho phép chạy đồng thời tối đa **3 models** (GCN, GAT, GraphSAGE) và so sánh:

- **Side-by-side graph visualization**: 3 canvas đặt cạnh nhau, cùng layout, khác colormap theo predictions.
- **Metrics comparison table**: Accuracy, F1-Macro, AUC-ROC, Training Time, Inference Latency.
- **Agreement heatmap**: matrix cho thấy 2 models có đồng ý về node `v42` hay không.
- **Embedding similarity**: cosine similarity giữa final embeddings của 2 models → correlation plot.

### 7.3 Explainability với GNNExplainer

GNNExplainer (Ying et al., 2019) học một mask cho edges và features để tối đa hóa mutual information với predicted label.

**Backend Implementation:**
```python
from torch_geometric.explain import Explainer, GNNExplainer

explainer = Explainer(
    model=model,
    algorithm=GNNExplainer(epochs=200),
    explanation_type='model',
    node_mask_type='attributes',
    edge_mask_type='object',
    model_config=dict(
        mode='multiclass_classification',
        task_level='node',
        return_type='log_probs'
    )
)

explanation = explainer(x, edge_index, index=target_node_id)
# explanation.edge_mask: [E] importance per edge
# explanation.node_mask: [N, F] importance per feature per node
```

**Frontend Display:**
- Render explanation subgraph với `edge_mask > threshold` (slider 0.0–1.0) để filter.
- Important features: horizontal bar chart, sorted by importance score.
- Highlight explanation nodes/edges trong main graph canvas.

### 7.4 Real-time Graph Editing

| Action | UI Gesture | Backend Call | Effect |
|---|---|---|---|
| Add Node | Double-click empty space | `POST /api/graph/{id}/nodes` | Thêm node mới với empty features, re-layout |
| Delete Node | Select → Delete key | `DELETE /api/graph/{id}/nodes/{node_id}` | Xóa node + tất cả edges liên quan |
| Add Edge | `Alt+drag` từ node A → node B | `POST /api/graph/{id}/edges` | Thêm edge, trigger lại inference nếu auto-mode on |
| Edit Features | Click node → edit feature trong Node Detail Panel | `PATCH /api/graph/{id}/nodes/{node_id}` | Cập nhật features, hiển thị prediction change |
| Auto Re-predict | Toggle trong Control Panel | Trigger `POST /api/predict` sau mỗi edit | Predictions cập nhật live, node colors thay đổi |

---

## 8. HIỆU NĂNG VÀ TỐI ƯU

### 8.1 Xử lý Graph Lớn

| Kỹ thuật | Khi nào dùng | Giới hạn xử lý |
|---|---|---|
| Level-of-Detail (LOD) Rendering | Luôn luôn (Sigma.js) | Render 100k+ nodes @ 60fps, chỉ hiện label khi zoom > 2x |
| Virtual Scrolling cho Node List | Node list panel > 1000 nodes | React Virtual (`react-virtual`), chỉ render visible rows |
| Graph Sampling cho Visualization | Graph > 10k nodes | Sample 5k nodes đại diện bằng Random Walk Sampling |
| Neighbor Sampling (GraphSAGE) | Training > 100k nodes | k=10 neighbors per layer, max_depth=2, batch_size=512 |
| Cluster-GCN | Training > 1M nodes | Partition graph thành clusters bằng METIS, train trên từng cluster |
| Streaming Embeddings | Embeddings > 50MB | Gửi theo chunks 1000 nodes/response, Progressive render trên frontend |

### 8.2 Caching Strategy

| Đối tượng cache | Storage | TTL | Cache key |
|---|---|---|---|
| Graph data processed | Redis | 1 giờ | `graph:{graph_id}:processed` |
| Model embeddings (all nodes) | Redis + MinIO | 24 giờ | `model:{model_id}:embeddings:{layer}` |
| Attention weights | Redis | 4 giờ | `model:{model_id}:attention:{layer}:{head}` |
| PCA/t-SNE projections | Redis | 1 giờ | `model:{model_id}:projection:{type}:{n_components}` |
| Prediction results | Redis | 30 phút | `model:{model_id}:predictions:{graph_id}` |
| GNNExplainer results | PostgreSQL + Redis | 48 giờ | `explain:{model_id}:{node_id}` |

### 8.3 Lazy Loading

- **Graph data**: load metadata trước, lazy load features và embeddings khi user click node.
- **Model checkpoints**: chỉ load model khi có inference request, giải phóng sau 15 phút idle.
- **Animation frames**: tính toán 10 frames đầu tiên, stream tiếp theo khi user play.
- **Embedding projections**: tính projection trên background thread, cache kết quả.

### 8.4 Performance Benchmarks (Mục tiêu)

| Metric | Target | Critical Threshold |
|---|---|---|
| Graph render (10k nodes) | < 500ms initial | < 2s |
| Node click → detail panel | < 100ms | < 300ms |
| Inference (1 node, trained model) | < 200ms | < 1s |
| Training start (enqueue) | < 500ms | < 2s |
| WebSocket latency (progress) | < 50ms | < 200ms |
| Embedding projection (1000 nodes PCA) | < 2s | < 5s |
| GNNExplainer (1 node) | < 30s | < 120s |
| Export PDF report | < 10s | < 30s |

---

## 9. BẢO MẬT VÀ TRIỂN KHAI

### 9.1 Bảo mật

#### Authentication & Authorization

- JWT Bearer Token với HS256, expiry 24h, refresh token 7 ngày.
- OAuth2 Password Flow cho API, OAuth2 Authorization Code cho SSO (tùy chọn).
- **RBAC**: 3 roles — `Admin` (full access), `Researcher` (train/predict/export), `Viewer` (read-only).
- **API Key** cho programmatic access (CI/CD, scripts) — rate limited, rotatable.

#### Data Security

- HTTPS/TLS 1.3 bắt buộc cho tất cả endpoints.
- Dataset upload: scan virus (ClamAV), validate JSON schema trước khi process.
- MinIO bucket policies: chỉ backend service account có quyền write, user access qua signed URLs (15 phút expiry).
- PostgreSQL: encrypted at rest, TLS connection, least-privilege service accounts.
- Secrets management: Vault (production) hoặc Docker secrets (dev).

### 9.2 Docker Compose (Development)

```yaml
# docker-compose.yml
version: '3.9'
services:
  frontend:
    build: ./frontend
    ports: ['3000:3000']
    environment:
      - VITE_API_URL=http://backend:8000
      - VITE_WS_URL=ws://backend:8000

  backend:
    build: ./backend
    ports: ['8000:8000']
    depends_on: [postgres, redis, minio]
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres/gnnvp
      - REDIS_URL=redis://redis:6379
      - MINIO_ENDPOINT=minio:9000
    volumes: ['./models:/app/models']

  celery_worker:
    build: ./backend
    command: celery -A app.celery worker -Q training,inference -c 2
    deploy:
      resources:
        reservations:
          devices: [{driver: nvidia, capabilities: [gpu]}]

  postgres:
    image: postgres:16-alpine
    volumes: ['pgdata:/var/lib/postgresql/data']

  redis:
    image: redis:7-alpine
    command: redis-server --maxmemory 2gb --maxmemory-policy allkeys-lru

  minio:
    image: minio/minio:latest
    command: server /data --console-address ':9001'
    ports: ['9000:9000', '9001:9001']
```

### 9.3 Production Deployment (Kubernetes)

| Service | Replicas | Resources | HPA Trigger |
|---|---|---|---|
| frontend (Nginx) | 2–5 | 0.5 CPU, 256MB RAM | CPU > 70% |
| backend (FastAPI) | 2–8 | 1 CPU, 512MB RAM | CPU > 60% hoặc request queue > 100 |
| celery_cpu_worker | 2–6 | 4 CPU, 8GB RAM | Queue depth > 5 jobs |
| celery_gpu_worker | 1–4 | 8 CPU, 32GB RAM, 1 GPU | GPU queue depth > 2 jobs |
| postgres | 1 (+ 1 replica) | 4 CPU, 16GB RAM | Manual scale |
| redis | 1 (Sentinel cluster) | 2 CPU, 4GB RAM | Manual scale |
| minio | 4 (distributed) | 2 CPU, 4GB RAM, 100GB SSD | Storage usage > 80% |

### 9.4 Logging và Monitoring

- **Application logs**: Structured JSON logging (structlog) → Loki → Grafana dashboard.
- **Metrics**: Prometheus scrape FastAPI metrics (request count, latency, error rate) + Celery task metrics.
- **Alerts**: PagerDuty — alert khi training job fail > 3 lần, API error rate > 5%, GPU memory > 90%.
- **Distributed tracing**: OpenTelemetry → Jaeger — trace từ API request → Celery task → ML forward pass.
- **Health checks**: `/health/live` (liveness), `/health/ready` (readiness), `/health/startup`.

---

## 10. ROADMAP PHÁT TRIỂN

### 10.1 MVP (Phase 1 — 3 tháng)

> 📌 Mục tiêu: Chạy được GNN cơ bản, visualize graph, xem kết quả training. Đủ để demo và thu thập phản hồi từ researchers.

| Feature | Module | Effort | Priority |
|---|---|---|---|
| Upload & parse graph dataset (Cora, custom JSON) | Backend + Frontend | 5 ngày | P0 |
| Train GCN và GraphSAGE (node classification) | ML Engine | 7 ngày | P0 |
| Training progress real-time qua WebSocket | Backend + Frontend | 3 ngày | P0 |
| Basic graph visualization (Sigma.js, force layout) | Frontend | 5 ngày | P0 |
| Node coloring theo predicted class | Frontend | 2 ngày | P0 |
| Node click → detail panel (features, prediction) | Frontend | 3 ngày | P0 |
| Loss/Accuracy chart real-time | Frontend | 2 ngày | P0 |
| Embedding projection 2D (PCA) | Backend + Frontend | 4 ngày | P0 |
| Docker Compose setup, basic auth (JWT) | Infrastructure | 3 ngày | P0 |

### 10.2 Version 1.5 (Phase 2 — tháng 4–6)

| Feature | Module | Effort |
|---|---|---|
| GAT training + Attention Weight Visualization | ML Engine + Frontend | 8 ngày |
| Message Passing Animation (step-by-step per layer) | Frontend + Backend | 10 ngày |
| GNNExplainer integration | ML Engine + Frontend | 7 ngày |
| Model Comparison (GCN vs GAT vs GraphSAGE) | Frontend | 5 ngày |
| t-SNE projection + 3D embedding viewer (Three.js) | Backend + Frontend | 6 ngày |
| Real-time graph editing (add/delete node/edge) | Frontend + Backend | 8 ngày |
| Graph Classification task support (QM9 dataset) | ML Engine | 5 ngày |
| Export experiments (PDF/HTML report) | Backend | 4 ngày |
| Kubernetes deployment + Monitoring (Prometheus/Grafana) | Infrastructure | 5 ngày |

### 10.3 Version 2.0 (Phase 3 — tháng 7–12) — Research Features

| Feature | Mô tả | Research Impact |
|---|---|---|
| Graph Transformer | Tích hợp Graphormer, GPS, so sánh với GNN truyền thống | Cao — SOTA mới nhất |
| Dynamic Graph Support | Hỗ trợ temporal graphs, animation timeline | Cao — mạng xã hội, giao dịch tài chính |
| Federated GNN | Training phân tán không chia sẻ raw data | Trung bình — privacy-preserving ML |
| Custom Architecture Builder | Drag-and-drop layer builder thiết kế GNN tùy chỉnh | Cao — research workflow |
| Multi-relational Graph (HAN) | Heterogeneous graph với nhiều loại node và edge | Cao — drug discovery, KG |
| Collaborative Workspace | Multi-user real-time collaboration trên cùng experiment | Trung bình — nhóm nghiên cứu |
| AutoML cho GNN | Tự động tìm kiếm hyperparameter tối ưu (NAS for GNN) | Trung bình — tiết kiệm thời gian |

### 10.4 Tóm tắt Timeline

| Milestone | Thời gian | Deliverable |
|---|---|---|
| M1: MVP Ready | Tháng 1–3 | System hoạt động end-to-end, GCN + GraphSAGE, graph viz cơ bản |
| M2: User Testing | Tháng 3 | Beta với 10 researchers, thu thập feedback, bug fixes |
| M3: GAT + Explainability | Tháng 4–5 | Attention viz, GNNExplainer, message passing animation |
| M4: Comparison & Export | Tháng 5–6 | Model comparison, export report, production deployment |
| M5: Advanced Research | Tháng 7+ | Graph Transformer, Dynamic Graph, Custom Builder |

---

## 11. PHỤ LỤC KỸ THUẬT

### 11.1 Cấu trúc Thư mục Dự án

```
gnn-visualization-platform/
├── frontend/                      # React + TypeScript
│   ├── src/
│   │   ├── components/
│   │   │   ├── GraphCanvas/       # Sigma.js wrapper
│   │   │   ├── ControlPanel/      # Model, layer, filter controls
│   │   │   ├── NodeDetail/        # Node inspection panel
│   │   │   ├── Dashboard/         # Training metrics
│   │   │   ├── EmbeddingViewer/   # PCA/t-SNE scatter
│   │   │   └── AttentionViz/      # GAT attention overlay
│   │   ├── store/                 # Zustand stores
│   │   ├── api/                   # React Query + axios
│   │   ├── hooks/                 # Custom hooks
│   │   └── utils/
│   └── Dockerfile
│
├── backend/                       # FastAPI + Python
│   ├── app/
│   │   ├── api/routes/            # All API endpoints
│   │   ├── core/                  # Config, auth, middleware
│   │   ├── models/                # SQLAlchemy models
│   │   ├── schemas/               # Pydantic schemas
│   │   ├── services/              # Business logic layer
│   │   └── celery_tasks/          # Async job definitions
│   ├── ml_engine/                 # PyTorch Geometric
│   │   ├── models/                # GCN, GAT, GraphSAGE
│   │   ├── trainers/              # Training loops
│   │   ├── explainers/            # GNNExplainer wrapper
│   │   ├── projections/           # PCA, t-SNE, UMAP
│   │   └── datasets/              # Dataset loaders (Cora, QM9...)
│   ├── tests/
│   └── Dockerfile
│
├── infrastructure/
│   ├── docker-compose.yml         # Local development
│   ├── docker-compose.prod.yml    # Production override
│   ├── k8s/                       # Kubernetes manifests
│   │   ├── deployments/
│   │   ├── services/
│   │   ├── ingress/
│   │   └── hpa/
│   └── monitoring/
│       ├── prometheus/
│       └── grafana/
│
├── docs/
│   ├── SRS_v1.0.md                # This document
│   ├── architecture/
│   └── api/
│
└── README.md
```

### 11.2 Danh sách Dependencies Backend

| Package | Version | Mục đích |
|---|---|---|
| `fastapi` | >=0.115 | Web framework |
| `uvicorn[standard]` | >=0.30 | ASGI server |
| `celery[redis]` | >=5.4 | Task queue |
| `sqlalchemy[asyncio]` | >=2.0 | ORM |
| `pydantic` | >=2.7 | Data validation |
| `torch` | >=2.3 | Deep learning |
| `torch-geometric` | >=2.5 | GNN library |
| `scikit-learn` | >=1.5 | PCA, t-SNE, metrics |
| `umap-learn` | >=0.5 | UMAP projection |
| `minio` | >=7.2 | Object storage client |
| `redis[hiredis]` | >=5.0 | Cache client |
| `python-jose[cryptography]` | >=3.3 | JWT handling |
| `structlog` | >=24.0 | Structured logging |
| `opentelemetry-sdk` | >=1.25 | Distributed tracing |

### 11.3 Biến Môi trường

| Variable | Mô tả | Default (dev) |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql+asyncpg://gnn:gnn@localhost/gnnvp` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379/0` |
| `MINIO_ENDPOINT` | MinIO host:port | `localhost:9000` |
| `MINIO_ACCESS_KEY` | MinIO access key | `minioadmin` |
| `MINIO_SECRET_KEY` | MinIO secret key | `minioadmin` |
| `JWT_SECRET_KEY` | JWT signing secret (**CHANGE IN PROD**) | `dev-secret-change-me` |
| `MAX_CONCURRENT_JOBS` | Max training jobs per instance | `4` |
| `MODEL_CACHE_TTL` | Seconds to keep model in memory | `900` (15 min) |
| `CORS_ORIGINS` | Allowed frontend origins | `http://localhost:3000` |

---

*© 2026 GNN-VP Research Platform*