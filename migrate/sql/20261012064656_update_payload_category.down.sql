BEGIN;

WITH RECURSIVE categories AS (
    SELECT guid, payload->>'key' AS key
    FROM container
    WHERE payload ->>'type' = 'category' AND valid_currently AND NOT deleted
),
terms AS (
    SELECT guid, payload->>'value' AS value
    FROM container
    WHERE payload->>'type' = 'term' AND valid_currently AND NOT deleted
),
is_part_of_relation_down(path, is_cycle) AS (
    SELECT array [c.guid] AS path, false, c.guid AS object
    FROM categories c
    UNION ALL
    SELECT array_append(r.path, c.guid),c.guid = ANY (r.path),c.guid
    FROM container c
    JOIN container_relation cr ON c.guid = cr.subject
        AND cr.predicate IN ('is-part-of', 'is-part-of-category')
        AND cr.valid_currently
        AND NOT cr.deleted
    JOIN is_part_of_relation_down r ON cr.object = r.object AND NOT r.is_cycle
    WHERE c.valid_currently
),
mapping AS (
    SELECT path[1] as category_guid, c.key, path[array_length(path, 1)] AS term_guid, t.value
    FROM is_part_of_relation_down
    JOIN categories c ON path[1] = c.guid
    JOIN terms t ON path[array_length(path, 1)] = t.guid
    WHERE array_length(path, 1) > 1
    ORDER BY c.key, t.value
), mapped_terms AS (
    SELECT revision, m.key AS category, m.value AS term
    FROM container, mapping m
    WHERE payload->'category' ? m.category_guid::text AND payload#>array['category', m.category_guid::text] ? m.term_guid::text
), aggregated_mapped_terms AS (
    SELECT revision, category, array_agg(term) AS term
    FROM mapped_terms
    GROUP BY revision, category
), aggregated_mapped_categories AS (
    SELECT revision, jsonb_object_agg(category, term) as category
    FROM aggregated_mapped_terms
    GROUP BY revision
)
UPDATE container SET payload = jsonb_set(payload, '{category}', category)
FROM aggregated_mapped_categories
WHERE container.revision = aggregated_mapped_categories.revision;

COMMIT;
