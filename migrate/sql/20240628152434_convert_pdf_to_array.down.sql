UPDATE container SET payload = jsonb_set(payload, '{pdf}', payload->'pdf'->0->0) WHERE payload->'pdf' IS NOT NULL;
