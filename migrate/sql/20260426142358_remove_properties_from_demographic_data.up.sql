BEGIN;

UPDATE container SET payload = payload - 'population' - 'area' WHERE payload->>'type' = 'demographic_data';

COMMIT;
