-- Convert administrativeType back to a plain string, keeping only the first
-- element of the array (data loss for multi-type entries is acceptable on rollback).
BEGIN;

UPDATE container
SET payload = jsonb_set(
    payload,
    '{administrativeType}',
    to_jsonb((payload->'administrativeType'->>0))
)
WHERE payload->>'type' = 'organizational_unit'
  AND jsonb_typeof(payload->'administrativeType') = 'array';

COMMIT;
