BEGIN;

UPDATE container SET payload = jsonb_set(payload, '{type}', '"help"') WHERE payload->>'type' = 'page';

COMMIT;
