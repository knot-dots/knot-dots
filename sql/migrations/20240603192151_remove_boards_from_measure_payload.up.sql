UPDATE container SET payload = payload - 'boards' WHERE payload->>'type' = 'measure';
