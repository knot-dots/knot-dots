BEGIN;

DROP INDEX IF EXISTS container_payload_slug_idx;

UPDATE container
SET payload = jsonb_set(
	payload,
	'{slug}',
	CASE
		WHEN jsonb_typeof(payload->'slug') = 'array' THEN payload->'slug'
		WHEN jsonb_typeof(payload->'slug') = 'string' THEN jsonb_build_array(payload->>'slug')
		ELSE '[]'::jsonb
	END,
	true
)
WHERE payload->>'type' = 'help';

CREATE INDEX container_payload_slug_idx ON container USING gin ((payload->'slug'));

COMMIT;
