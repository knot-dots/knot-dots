UPDATE container
SET payload = replace(payload::text, 'audience.citizens', 'audience.public')::jsonb
WHERE payload ? 'audience';
UPDATE container
SET payload = replace(payload::text, 'audience.administration', 'audience.organization')::jsonb
WHERE payload ? 'audience';
