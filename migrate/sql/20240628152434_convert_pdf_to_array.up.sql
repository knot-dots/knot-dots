UPDATE container SET payload = jsonb_set(payload, '{pdf}', jsonb_build_array(json_build_array(payload->'pdf', payload->>'title'))) WHERE payload->'pdf' IS NOT NULL;
