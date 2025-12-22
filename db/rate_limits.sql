DROP TABLE IF EXISTS rate_limits;

CREATE TABLE rate_limits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  identifier TEXT NOT NULL,
  timestamp INTEGER NOT NULL
);

CREATE INDEX idx_rate_limits_identifier_timestamp
ON rate_limits(identifier, timestamp);