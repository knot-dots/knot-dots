UPDATE container SET payload = payload - 'effect' WHERE payload->>'effect' IS NOT NULL;
