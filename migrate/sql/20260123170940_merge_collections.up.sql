BEGIN;

UPDATE container SET payload = jsonb_set(payload, '{type}', '"teaser_collection"') WHERE payload->>'type' = 'accordion_collection';

COMMIT;
