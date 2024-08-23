UPDATE container SET payload = payload - 'objective' WHERE payload->>'type' = 'milestone';
UPDATE container SET payload['type'] = to_jsonb('milestone'::text) WHERE payload->>'type' = 'measure_milestone';
