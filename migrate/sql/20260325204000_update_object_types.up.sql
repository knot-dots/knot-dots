BEGIN;

UPDATE container
SET payload = replace(payload::text, '"indicator"', '"indicator_template"')::jsonb
WHERE payload ? 'objectTypes';

COMMIT;
