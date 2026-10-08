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

-- Rename the payload type in all revisions
UPDATE container
SET payload = jsonb_set(payload, '{type}', '"indicator"')
WHERE payload->>'type' = 'indicator_template';

-- Object types of categories
UPDATE container
SET payload = jsonb_set(
    payload,
    '{objectTypes}',
    pg_temp.replace_array_element(payload->'objectTypes', 'indicator_template', 'indicator')
)
WHERE payload->>'type' = 'category'
  AND payload->'objectTypes' ? 'indicator_template';

-- Type filters of custom collections
UPDATE container
SET payload = jsonb_set(
    payload,
    '{filter,type}',
    pg_temp.replace_array_element(payload->'filter'->'type', 'indicator_template', 'indicator')
)
WHERE payload->>'type' = 'custom_collection'
  AND payload->'filter'->'type' ? 'indicator_template';

-- Chapter types of programs
UPDATE container
SET payload = jsonb_set(
    payload,
    '{chapterType}',
    pg_temp.replace_array_element(payload->'chapterType', 'indicator_template', 'indicator')
)
WHERE payload->>'type' = 'program'
  AND payload->'chapterType' ? 'indicator_template';

-- Help slugs for the detail view
UPDATE container
SET payload = jsonb_set(
    payload,
    '{slug}',
    pg_temp.replace_array_element(payload->'slug', 'indicator-template-view', 'indicator-view')
)
WHERE payload->>'type' = 'help'
  AND payload->'slug' ? 'indicator-template-view';

COMMIT;
