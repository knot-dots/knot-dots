BEGIN;

UPDATE container SET payload = payload - 'resource' WHERE payload ? 'resource' AND payload->>'type' = 'simple_measure';

COMMIT;
