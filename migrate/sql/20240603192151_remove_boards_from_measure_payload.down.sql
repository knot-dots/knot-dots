UPDATE container SET payload = jsonb_set(payload, '{"boards"}', '[]', true) WHERE payload->>'type' = 'measure';
