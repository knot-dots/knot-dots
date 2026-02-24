BEGIN;

UPDATE container
SET payload = jsonb_set(
	payload,
	'{category}',
	COALESCE(payload->'category', '{}'::jsonb)
		- 'sdg'
		- 'topic'
		- 'policyFieldBNK'
		- 'audience',
	true
)
WHERE payload ? 'category';

COMMIT;
