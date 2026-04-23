# GNN-VP Phase 3 Plan (FE + BE + Admin + MySQL)

## 1. Admin UI Plan (chi tiết control)

### 1.1 Dashboard quản trị
- Tổng user, active/suspended, admin/user ratio.
- Tổng bài viết, public/private, bài bị report.
- Training activity: số run/ngày, model usage (GCN/GAT/GraphSAGE/Transformer).
- Hàng đợi job backend: queued/running/failed/completed.

### 1.2 User Management
- Tìm kiếm user theo email/tên.
- Đổi role `user/admin`.
- Khóa/mở khóa tài khoản (`active/suspended`).
- Xem lịch sử hoạt động: login gần nhất, số bài viết, số run training.
- Reset password cưỡng bức (flow email token).

### 1.3 Content Moderation
- Duyệt/xóa bài training post.
- Gắn cờ `featured`, `hidden`, `reported`.
- Log lý do moderation và ai thao tác.
- Bộ lọc theo tag/model/dataset/thời gian.

### 1.4 Experiment Control
- Quản lý template training config.
- Quota theo user/team: max jobs, max epochs, max GPU time.
- Kill/retry training jobs.
- Quản lý model artifacts và retention policy.

### 1.5 System Control
- Feature flags: bật/tắt Graph Transformer, Dynamic Graph, AutoML.
- Health check services: frontend, api, worker, redis, mysql, minio.
- Audit logs: đăng nhập, đổi role, xóa bài, hủy job.

## 2. MySQL Database Design

### 2.1 Core tables
- `users`
- `user_profiles`
- `sessions`
- `posts`
- `post_likes`
- `post_bookmarks`
- `training_runs`
- `training_metrics`
- `artifacts`
- `job_queue`
- `audit_logs`

### 2.2 Schema draft (MySQL 8)

```sql
CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user','admin') NOT NULL DEFAULT 'user',
  status ENUM('active','suspended') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE user_profiles (
  user_id BIGINT PRIMARY KEY,
  display_name VARCHAR(120) NOT NULL,
  bio TEXT NULL,
  avatar_url VARCHAR(500) NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE sessions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  refresh_token_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sessions_user (user_id)
);

CREATE TABLE training_runs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  model_type ENUM('GCN','GAT','GraphSAGE','GraphTransformer') NOT NULL,
  dataset_name VARCHAR(255) NOT NULL,
  status ENUM('queued','running','completed','failed','canceled') NOT NULL DEFAULT 'queued',
  epoch_current INT NOT NULL DEFAULT 0,
  epoch_total INT NOT NULL DEFAULT 0,
  best_accuracy DECIMAL(6,4) NULL,
  best_loss DECIMAL(8,5) NULL,
  started_at DATETIME NULL,
  finished_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_runs_user_created (user_id, created_at DESC),
  INDEX idx_runs_status (status)
);

CREATE TABLE training_metrics (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  run_id BIGINT NOT NULL,
  epoch INT NOT NULL,
  loss DECIMAL(8,5) NOT NULL,
  accuracy DECIMAL(6,4) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (run_id) REFERENCES training_runs(id) ON DELETE CASCADE,
  UNIQUE KEY uq_run_epoch (run_id, epoch)
);

CREATE TABLE posts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  author_id BIGINT NOT NULL,
  run_id BIGINT NULL,
  title VARCHAR(255) NOT NULL,
  summary TEXT NOT NULL,
  content MEDIUMTEXT NOT NULL,
  tags_json JSON NOT NULL,
  visibility ENUM('public','private') NOT NULL DEFAULT 'public',
  moderation_status ENUM('normal','hidden','reported','featured') NOT NULL DEFAULT 'normal',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (run_id) REFERENCES training_runs(id) ON DELETE SET NULL,
  INDEX idx_posts_visibility_created (visibility, created_at DESC),
  INDEX idx_posts_author_created (author_id, created_at DESC)
);

CREATE TABLE post_likes (
  user_id BIGINT NOT NULL,
  post_id BIGINT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, post_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE TABLE post_bookmarks (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  post_id BIGINT NOT NULL,
  note VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_bookmark_user_post (user_id, post_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE TABLE artifacts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  run_id BIGINT NOT NULL,
  artifact_type ENUM('checkpoint','embedding','report','explain_mask') NOT NULL,
  object_key VARCHAR(500) NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (run_id) REFERENCES training_runs(id) ON DELETE CASCADE,
  INDEX idx_artifacts_run (run_id)
);

CREATE TABLE job_queue (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  run_id BIGINT NOT NULL,
  queue_name VARCHAR(100) NOT NULL,
  priority INT NOT NULL DEFAULT 5,
  status ENUM('queued','running','done','failed') NOT NULL DEFAULT 'queued',
  payload_json JSON NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (run_id) REFERENCES training_runs(id) ON DELETE CASCADE,
  INDEX idx_job_status_priority (status, priority)
);

CREATE TABLE audit_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  actor_user_id BIGINT NULL,
  action VARCHAR(120) NOT NULL,
  target_type VARCHAR(80) NOT NULL,
  target_id BIGINT NULL,
  metadata_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_audit_created (created_at DESC)
);
```

## 3. Phase 3 chuẩn (roadmap đề xuất)

### Sprint 0 (1 tuần) - Hardening nền tảng
- Tách mock service thành API client thật (axios + auth token interceptor).
- Bổ sung `react-router` để tách route `lab/community/vault/profile/admin`.
- Code splitting cho bundle lớn (`lazy` import các panel nặng: 3D, graph).
- Chuẩn hóa encoding UTF-8 cho toàn bộ text UI.

### Sprint 1 (2 tuần) - Auth + User + Community backend
- BE: auth JWT + refresh token + RBAC.
- FE: login/register/profile call API thật.
- BE: CRUD posts/bookmarks/likes.
- FE: thay localStorage social bằng API + optimistic update.

### Sprint 2 (2 tuần) - Training pipeline integration
- BE: training_runs + metrics + websocket stream thật.
- FE: map training stream sang dashboard hiện tại.
- BE: convert run -> post API (one-click publish).
- FE: nút publish từ run detail.

### Sprint 3 (2 tuần) - Admin v1
- FE: dashboard admin + user moderation + content moderation.
- BE: admin endpoints + audit logs + system health endpoints.
- RBAC guard cho mọi API admin.

### Sprint 4 (3 tuần) - Research features foundation
- Graph Transformer base integration.
- Dynamic graph timeline data model.
- Artifact versioning + experiment compare API.
- Chuẩn bị drag-drop architecture builder (schema + UI skeleton).

## 4. Fix list ưu tiên (từ review hiện trạng)

### FE
- Tách `App.tsx` lớn thành route-level pages.
- Bỏ dependency mock trực tiếp trong UI chính.
- Chuẩn hóa error boundary + toast system.
- Tối ưu bundle size > 500kB (split Three.js và Sigma-heavy modules).

### BE
- Dựng backend thật theo 3-tier trong `read.md` (FastAPI/Celery/Redis/MySQL/MinIO).
- Bổ sung idempotency cho start training.
- Thêm metrics/trace/health endpoint chuẩn cho production.

### QA/DevOps
- E2E tests cho auth + post CRUD + admin moderation.
- Contract test FE/BE cho payload training/explainer.
- CI: lint + typecheck + test + build + smoke deploy.

