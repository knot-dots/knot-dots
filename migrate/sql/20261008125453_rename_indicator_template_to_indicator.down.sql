BEGIN;

-- Replace every occurrence of old_value in a JSON array of strings, keeping
-- the order of the elements.
CREATE FUNCTION pg_temp.replace_array_element(arr jsonb, old_value text, new_value text)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT coalesce(
        jsonb_agg(CASE WHEN t.value = old_value THEN new_value ELSE t.value END ORDER BY t.ordinality),
        '[]'::jsonb
    )
    FROM jsonb_array_elements_text(arr) WITH ORDINALITY AS t(value, ordinality)
$$;

-- Only touch the type key: actual_data payloads use "indicator" as a key for
-- the referenced indicator, so a textual replacement must not be used here.
UPDATE container
SET payload = jsonb_set(payload, '{type}', '"indicator_template"')
WHERE payload->>'type' = 'indicator';

UPDATE container
SET payload = jsonb_set(
    payload,
    '{objectTypes}',
    pg_temp.replace_array_element(payload->'objectTypes', 'indicator', 'indicator_template')
)
WHERE payload->>'type' = 'category'
  AND payload->'objectTypes' ? 'indicator';

UPDATE container
SET payload = jsonb_set(
    payload,
    '{filter,type}',
    pg_temp.replace_array_element(payload->'filter'->'type', 'indicator', 'indicator_template')
)
WHERE payload->>'type' = 'custom_collection'
  AND payload->'filter'->'type' ? 'indicator';

UPDATE container
SET payload = jsonb_set(
    payload,
    '{chapterType}',
    pg_temp.replace_array_element(payload->'chapterType', 'indicator', 'indicator_template')
)
WHERE payload->>'type' = 'program'
  AND payload->'chapterType' ? 'indicator';

UPDATE container
SET payload = jsonb_set(
    payload,
    '{slug}',
    pg_temp.replace_array_element(payload->'slug', 'indicator-view', 'indicator-template-view')
)
WHERE payload->>'type' = 'help'
  AND payload->'slug' ? 'indicator-view';

COMMIT;
