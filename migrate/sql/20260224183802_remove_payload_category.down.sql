BEGIN;

UPDATE container
SET payload = jsonb_set(payload, '{category}', '[]'::jsonb, true)
WHERE NOT (payload ? 'category');

COMMIT;