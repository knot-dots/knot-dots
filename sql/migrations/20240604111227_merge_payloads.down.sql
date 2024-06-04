UPDATE container SET payload = jsonb_set(payload, '{"objective"}', '[]', true) WHERE payload->>'type' = 'milestone';
