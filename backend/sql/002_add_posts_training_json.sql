USE gnnvp;

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS training_json LONGTEXT NULL AFTER tags_json;

UPDATE posts
SET training_json = '{}'
WHERE training_json IS NULL OR training_json = '';
