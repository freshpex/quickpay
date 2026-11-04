ALTER TABLE two_factors ADD COLUMN failed_verification_count integer NOT NULL DEFAULT 0;
ALTER TABLE two_factors ADD COLUMN locked_until timestamptz;
