ALTER TABLE journals ADD COLUMN creation_xid bigint NOT NULL DEFAULT txid_current();
CREATE FUNCTION guard_journal_append() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM journals WHERE id=NEW.journal_id AND creation_xid=txid_current()) THEN
    RAISE EXCEPTION 'Cannot append to a committed journal';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER journal_append_guard BEFORE INSERT ON ledger_entries FOR EACH ROW EXECUTE FUNCTION guard_journal_append();
CREATE FUNCTION guard_cached_balance() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
  IF TG_OP='INSERT' AND NEW.balance<>0 THEN RAISE EXCEPTION 'Initial ledger balance must be zero'; END IF;
  IF TG_OP='UPDATE' AND NEW.balance<>OLD.balance AND pg_trigger_depth()<2 THEN RAISE EXCEPTION 'Balances change through journals only'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER ledger_balance_guard BEFORE INSERT OR UPDATE ON ledger_accounts FOR EACH ROW EXECUTE FUNCTION guard_cached_balance();
ALTER TABLE ledger_accounts DROP CONSTRAINT ledger_accounts_bucket_check;
ALTER TABLE ledger_accounts ADD CONSTRAINT ledger_accounts_bucket_check CHECK(bucket IN ('available','reserved','rewards','clearing','revenue','reward_expense','reward_debt','debt'));
