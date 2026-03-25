BEGIN;

UPDATE container
SET payload = replace(payload::text, '"indicator_template"', '"indicator"')::jsonb
WHERE payload ? 'objectTypes';

COMMIT;
