CREATE TABLE boards (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  admin_password_hash TEXT NOT NULL,
  promoter_name TEXT,
  promoter_logo_key TEXT,
  promoter_slogan TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE posts (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES boards(id),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  photo_key TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  contact_whatsapp TEXT,
  contact_instagram TEXT,
  contact_address TEXT,
  duration_weeks INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TEXT,
  mgmt_token_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  approved_at TEXT
);

CREATE TABLE comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id),
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_posts_board_status ON posts(board_id, status);
CREATE INDEX idx_comments_post_status ON comments(post_id, status);
