BEGIN;

UPDATE container SET payload = jsonb_set(payload, '{type}', '"page"') WHERE payload->>'type' = 'help';

COMMIT;
