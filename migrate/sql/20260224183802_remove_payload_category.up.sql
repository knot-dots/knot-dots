BEGIN;

UPDATE container
SET payload = payload - 'category'
WHERE payload ? 'category';

COMMIT;
