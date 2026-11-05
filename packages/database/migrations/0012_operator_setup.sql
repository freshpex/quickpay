WITH verified AS (
  UPDATE users AS u
  SET email_verified = true, updated_at = now()
  WHERE u.role = 'admin'
    AND u.email_verified = false
    AND EXISTS (
      SELECT 1 FROM audit_events AS a
      WHERE a.actor_id = u.id
        AND a.resource = u.id
        AND a.action = 'admin.initial_provisioned'
        AND a.after_value->>'source' = 'operator-request'
    )
  RETURNING u.id
)
INSERT INTO audit_events(id, actor_id, action, resource, before_value, after_value, correlation_id)
SELECT md5('0012:verify-admin:' || id), id, 'admin.email_verified_by_operator', id,
       '{"emailVerified":false}'::jsonb,
       '{"emailVerified":true,"source":"operator-request","migration":"0012"}'::jsonb,
       md5('0012:verify-admin:' || id)
FROM verified;

UPDATE service_catalog
SET enabled = true
WHERE current_setting('quickpay.payment_mode', true) = 'sandbox'
  AND provider = 'vtpass'
  AND id IN ('mtn', 'airtel', 'glo', 'etisalat', 'mtn-data', 'airtel-data',
             'ikeja-electric', 'eko-electric', 'dstv', 'gotv', 'smile-direct', 'waec');
