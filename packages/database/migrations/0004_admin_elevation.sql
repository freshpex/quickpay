CREATE TABLE admin_elevations(session_id text PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,expires_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
