CREATE TABLE IF NOT EXISTS rate_limits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  identifier TEXT NOT NULL,
  timestamp TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier_timestamp
ON rate_limits(identifier, timestamp);