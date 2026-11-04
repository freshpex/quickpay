-- Free hosts have ephemeral filesystems. Keep new private evidence encrypted
-- in the same PostgreSQL database; existing encrypted files remain readable.
ALTER TABLE evidence ADD COLUMN encrypted_content text;
