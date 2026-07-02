BEGIN;

UPDATE container
SET payload = payload - 'nameOSM' - 'nameBBSR'
WHERE payload->>'type' = 'organizational_unit' AND (payload ? 'nameOSM' OR payload ? 'nameBBSR');

COMMIT;
