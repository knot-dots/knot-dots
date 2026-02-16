-- Copy legacy payload.category into payload.sdg (only when sdg is missing)
UPDATE container
SET payload = jsonb_set(payload, '{sdg}', payload->'category', true)
WHERE payload ? 'category'
  AND NOT payload ? 'sdg';
