UPDATE container SET payload = jsonb_set(payload, '{"objective"}', '[]', true) WHERE payload->>'type' IN ('model', 'operational_goal', 'strategic_goal', 'vision');
