CREATE TABLE notification_preferences (
  user_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  push_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE mobile_devices (
  installation_id uuid PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  encrypted_token text NOT NULL,
  platform text NOT NULL CHECK(platform IN ('ios','android')),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mobile_devices_user ON mobile_devices(user_id);
CREATE TABLE push_tickets (
  id text PRIMARY KEY,
  installation_id uuid NOT NULL REFERENCES mobile_devices(installation_id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Notification creation stays transactional; provider delivery happens in the worker.
CREATE FUNCTION enqueue_notification_push() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO jobs(id,type,payload,dedupe)
  VALUES(gen_random_uuid()::text,'push-notification',jsonb_build_object('notificationId',NEW.id),'push:'||NEW.id)
  ON CONFLICT(dedupe) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER notification_push AFTER INSERT ON notifications FOR EACH ROW EXECUTE FUNCTION enqueue_notification_push();
