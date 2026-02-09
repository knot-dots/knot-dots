-- Remove payload.sdg values that were introduced from payload.category
UPDATE container
SET payload = payload - 'sdg'
WHERE payload ? 'sdg';
