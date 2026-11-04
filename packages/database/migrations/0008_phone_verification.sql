ALTER TABLE phone_challenges RENAME COLUMN code_hash TO provider_reference;
ALTER TABLE phone_challenges ADD COLUMN phone_number text NOT NULL DEFAULT '';
ALTER TABLE phone_challenges ADD COLUMN consumed_at timestamptz;
