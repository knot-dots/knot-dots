UPDATE container SET payload = jsonb_set(payload, '{"effect"}', '[]', true) WHERE payload->>'type' IN ('measure', 'simple_measure');
