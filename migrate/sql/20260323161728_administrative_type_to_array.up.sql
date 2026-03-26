-- Convert administrativeType from a plain string to a JSON array in all
-- organizational_unit containers that still store a scalar value.
BEGIN;

UPDATE container
SET payload = jsonb_set(
    payload,
    '{administrativeType}',
    jsonb_build_array(payload->>'administrativeType')
)
WHERE payload->>'type' = 'organizational_unit'
  AND jsonb_typeof(payload->'administrativeType') = 'string';

COMMIT;
