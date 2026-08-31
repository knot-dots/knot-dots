BEGIN;

UPDATE container
SET payload = payload - 'template'
WHERE payload->>'type' = 'chapter'
	AND payload ? 'template';

COMMIT;
