BEGIN;

UPDATE container
SET payload = jsonb_set(payload, '{programStatus}', '"program_status.idea"', true)
WHERE payload->>'type' = 'program'
  AND NOT payload ? 'programStatus';

COMMIT;
