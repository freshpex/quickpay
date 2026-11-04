CREATE FUNCTION guard_transaction_identity() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
  IF ROW(NEW.user_id,NEW.kind,NEW.amount,NEW.fee,NEW.currency,NEW.reference,NEW.idempotency_key,NEW.request_hash)
     IS DISTINCT FROM ROW(OLD.user_id,OLD.kind,OLD.amount,OLD.fee,OLD.currency,OLD.reference,OLD.idempotency_key,OLD.request_hash) THEN
    RAISE EXCEPTION 'Transaction financial identity is immutable';
  END IF;
  IF NEW.status<>OLD.status AND NOT (
    (OLD.status='created' AND NEW.status IN ('awaiting_authorization','processing','cancelled','failed')) OR
    (OLD.status='awaiting_authorization' AND NEW.status IN ('processing','cancelled','failed','successful')) OR
    (OLD.status='processing' AND NEW.status IN ('successful','failed','reversed','cancelled','awaiting_authorization')) OR
    (OLD.status='successful' AND NEW.status='reversed')
  ) THEN RAISE EXCEPTION 'Invalid financial state transition'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER transaction_identity_guard BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION guard_transaction_identity();
