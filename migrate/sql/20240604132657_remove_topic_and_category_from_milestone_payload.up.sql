UPDATE container SET payload = payload - 'category' WHERE payload->>'type' = 'milestone';
UPDATE container SET payload = payload - 'topic' WHERE payload->>'type' = 'milestone';
