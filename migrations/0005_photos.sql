CREATE TABLE photos (
  key TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id),
  content_type TEXT NOT NULL,
  data_base64 TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_photos_post ON photos(post_id);
