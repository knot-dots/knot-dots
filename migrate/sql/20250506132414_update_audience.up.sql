UPDATE container
SET payload = replace(payload::text, 'audience.public', 'audience.citizens')::jsonb
WHERE payload ? 'audience';
UPDATE container
SET payload = replace(payload::text, 'audience.organization', 'audience.administration')::jsonb
WHERE payload ? 'audience';
UPDATE container
SET payload = jsonb_set(payload, '{audience}', (payload->'audience') - 'audience.project_management')
WHERE payload ? 'audience';
