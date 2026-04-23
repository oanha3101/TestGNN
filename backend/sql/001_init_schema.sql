-- GNN-VP Phase 3 - Initial MySQL schema
-- Run this file in phpMyAdmin (SQL tab) before starting backend.

CREATE DATABASE IF NOT EXISTS gnnvp
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE gnnvp;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user','admin') NOT NULL DEFAULT 'user',
  status ENUM('active','suspended') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id BIGINT PRIMARY KEY,
  display_name VARCHAR(120) NOT NULL,
  bio TEXT NULL,
  avatar_url VARCHAR(500) NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sessions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  refresh_token_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sessions_user (user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS training_runs (
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
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS training_metrics (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  run_id BIGINT NOT NULL,
  epoch INT NOT NULL,
  loss DECIMAL(8,5) NOT NULL,
  accuracy DECIMAL(6,4) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (run_id) REFERENCES training_runs(id) ON DELETE CASCADE,
  UNIQUE KEY uq_run_epoch (run_id, epoch)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS posts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  author_id BIGINT NOT NULL,
  run_id BIGINT NULL,
  title VARCHAR(255) NOT NULL,
  summary TEXT NOT NULL,
  content MEDIUMTEXT NOT NULL,
  tags_json JSON NOT NULL,
  training_json JSON NOT NULL,
  visibility ENUM('public','private') NOT NULL DEFAULT 'public',
  moderation_status ENUM('normal','hidden','reported','featured') NOT NULL DEFAULT 'normal',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (run_id) REFERENCES training_runs(id) ON DELETE SET NULL,
  INDEX idx_posts_visibility_created (visibility, created_at DESC),
  INDEX idx_posts_author_created (author_id, created_at DESC)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS post_likes (
  user_id BIGINT NOT NULL,
  post_id BIGINT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, post_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS post_bookmarks (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  post_id BIGINT NOT NULL,
  note VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_bookmark_user_post (user_id, post_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS artifacts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  run_id BIGINT NOT NULL,
  artifact_type ENUM('checkpoint','embedding','report','explain_mask') NOT NULL,
  object_key VARCHAR(500) NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (run_id) REFERENCES training_runs(id) ON DELETE CASCADE,
  INDEX idx_artifacts_run (run_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS job_queue (
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
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  actor_user_id BIGINT NULL,
  action VARCHAR(120) NOT NULL,
  target_type VARCHAR(80) NOT NULL,
  target_id BIGINT NULL,
  metadata_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_audit_created (created_at DESC)
) ENGINE=InnoDB;
