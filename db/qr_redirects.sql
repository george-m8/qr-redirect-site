CREATE TABLE IF NOT EXISTS qr_codes (
  slug TEXT PRIMARY KEY,
  destination TEXT NOT NULL,
  created_at TEXT NOT NULL
);