BEGIN;

WITH custom_category_keys AS (
    SELECT DISTINCT payload->>'key' AS key
    FROM container
    WHERE payload->>'type' = 'category'
        AND valid_currently = true
        AND payload ? 'key'
        AND payload->>'key' NOT IN ('sdg', 'topic', 'policyFieldBNK', 'audience')
),
to_move AS (
    SELECT
        target.revision,
        jsonb_strip_nulls(
            jsonb_object_agg(k.key, target.payload->k.key)
        ) AS obj
    FROM container AS target
    JOIN custom_category_keys AS k ON (target.payload ? k.key)
    WHERE jsonb_typeof(target.payload->k.key) = 'array'
        AND NOT EXISTS (
            SELECT 1
            FROM jsonb_array_elements(target.payload->k.key) AS elem
            WHERE jsonb_typeof(elem) <> 'string'
        )
        AND NOT (target.payload->'category' ? k.key)
    GROUP BY target.revision
)
UPDATE container AS target
SET payload = jsonb_set(
    (
        target.payload - COALESCE(
            (
                SELECT array_agg(key)
                FROM jsonb_object_keys(COALESCE(to_move.obj, '{}'::jsonb)) AS key
            ),
            ARRAY[]::text[]
        )
    ),
    '{category}',
    COALESCE(target.payload->'category', '{}'::jsonb) || COALESCE(to_move.obj, '{}'::jsonb),
    true
)
FROM to_move
WHERE target.revision = to_move.revision;

COMMIT;
