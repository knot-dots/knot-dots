BEGIN;

UPDATE container SET payload = payload - 'boards' WHERE payload ? 'boards';

COMMIT;
