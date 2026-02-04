UPDATE container
SET payload = jsonb_set(
	payload,
	'{title}',
	to_jsonb(regexp_replace(payload->>'title', '^\s*\d+\s*[-–—]\s*', '', 'g')),
	true
)
WHERE payload->>'type' = 'term'
	AND payload ? 'title'
	AND (payload->>'title') ~ '^\s*\d+\s*[-–—]\s*';
