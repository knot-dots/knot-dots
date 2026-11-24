BEGIN;

-- Turns the hrefs that refer to pages by guids back into relative hrefs with
-- guids, which resolve on the current host. Favorites removed or merged when
-- converting them are not restored.
CREATE FUNCTION pg_temp.relative_hrefs(favorites jsonb) RETURNS jsonb
    LANGUAGE sql IMMUTABLE AS
$$
SELECT coalesce(jsonb_agg(
    CASE
        WHEN favorite->>'href' LIKE 'knotdots://%' THEN jsonb_set(
            favorite,
            '{href}',
            to_jsonb('/' || regexp_replace(favorite->>'href', '^knotdots://[^/?]*/?', ''))
        )
        ELSE favorite
    END
    ORDER BY position
), '[]')
FROM jsonb_array_elements(favorites) WITH ORDINALITY AS f(favorite, position)
$$;

UPDATE container
SET payload = jsonb_set(payload, '{favorite}', pg_temp.relative_hrefs(payload->'favorite'))
WHERE payload->>'type' IN ('organization', 'organizational_unit')
    AND jsonb_typeof(payload->'favorite') = 'array';

UPDATE container
SET payload = jsonb_set(payload, '{platformFavorite}', pg_temp.relative_hrefs(payload->'platformFavorite'))
WHERE payload->>'type' = 'organization'
    AND jsonb_typeof(payload->'platformFavorite') = 'array';

UPDATE "user"
SET settings = jsonb_set(settings, '{favorite}', pg_temp.relative_hrefs(settings->'favorite'))
WHERE jsonb_typeof(settings->'favorite') = 'array';

COMMIT;
