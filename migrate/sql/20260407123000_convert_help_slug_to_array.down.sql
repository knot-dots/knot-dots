BEGIN;

DROP INDEX IF EXISTS container_payload_slug_idx;

UPDATE container
SET payload = jsonb_set(
	payload,
	'{slug}',
	CASE
		WHEN jsonb_typeof(payload->'slug') = 'array' AND jsonb_array_length(payload->'slug') > 0
			THEN to_jsonb(payload->'slug'->>0)
		WHEN jsonb_typeof(payload->'slug') = 'string'
			THEN to_jsonb(payload->>'slug')
		ELSE '""'::jsonb
	END,
	true
)
WHERE payload->>'type' = 'help';

CREATE INDEX container_payload_slug_idx ON container ((payload->>'slug'));

COMMIT;
