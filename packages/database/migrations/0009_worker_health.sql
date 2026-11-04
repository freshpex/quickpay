CREATE TABLE IF NOT EXISTS worker_heartbeats (
  name text PRIMARY KEY,
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
