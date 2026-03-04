BEGIN;

UPDATE container SET payload = payload - 'resource' WHERE payload ? 'resource' AND payload->>'type' IN ('measure', 'simple_measure');;

COMMIT;
