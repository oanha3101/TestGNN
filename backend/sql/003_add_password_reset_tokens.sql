-- Migration 003 — password reset tokens for the forgot-password flow.
-- Run this once against the live schema (``mysql gnnvp < 003_add_password_reset_tokens.sql``
-- or import via phpMyAdmin) before deploying the forgot-password endpoints.

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  token_hash VARCHAR(128) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_password_reset_tokens_token_hash (token_hash),
  KEY ix_password_reset_tokens_user_id (user_id),
  CONSTRAINT fk_password_reset_tokens_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
