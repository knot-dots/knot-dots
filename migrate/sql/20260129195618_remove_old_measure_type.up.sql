BEGIN;

UPDATE container SET payload = payload - 'measureType' WHERE payload ? 'measureType';

COMMIT;
