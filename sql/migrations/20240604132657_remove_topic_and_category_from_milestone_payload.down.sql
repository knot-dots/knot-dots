UPDATE container SET payload = jsonb_set(payload, '{"category"}', '[]', true) WHERE payload->>'type' = 'milestone';
UPDATE container SET payload = jsonb_set(payload, '{"topic"}', '[]', true) WHERE payload->>'type' = 'milestone';
