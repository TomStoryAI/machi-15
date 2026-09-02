CREATE TABLE admin_sessions (
  token_hash TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES boards(id),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_admin_sessions_board ON admin_sessions(board_id);
