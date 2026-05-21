BEGIN;

UPDATE container
SET payload = jsonb_set(payload, '{goalStatus}', '"goal_status.idea"', true)
WHERE payload->>'type' = 'goal'
  AND NOT payload ? 'goalStatus';

COMMIT;
