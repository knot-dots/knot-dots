BEGIN;

UPDATE container
SET payload = jsonb_set(
	payload,
	'{category}',
	COALESCE(payload->'category', '{}'::jsonb)
		|| jsonb_strip_nulls(
			jsonb_build_object(
				'sdg', payload->'sdg',
				'topic', payload->'topic',
				'policyFieldBNK', payload->'policyFieldBNK',
				'audience', payload->'audience'
			)
		),
	true
)
WHERE payload ? 'sdg'
	OR payload ? 'topic'
	OR payload ? 'policyFieldBNK'
	OR payload ? 'audience';

COMMIT;
