BEGIN;

-- Favorites used to be stored with the href of the page they point to. Since
-- slugs replace guids in URLs, these hrefs come in different forms for the
-- same page: relative or fully qualified, with the guid or the slug of the
-- organization or organizational unit in the path, and with the guid
-- subdomain, the slug subdomain or the custom domain of the organization as
-- host. Favorites now refer to the page by guids and independent of the
-- instance, which the app turns into the URL to link with:
--
--   knotdots://<organization guid>/<organization or organizational unit guid>/…?<query>
--
-- Hrefs that do not point to a page are removed, the hash is dropped and
-- duplicates are merged into the first of them.

CREATE FUNCTION pg_temp.default_organization() RETURNS uuid
    LANGUAGE sql STABLE AS
$$
SELECT guid
FROM container
WHERE payload->>'type' = 'organization'
    AND coalesce((payload->>'default')::boolean, false)
    AND valid_currently
    AND NOT deleted
LIMIT 1
$$;

-- Returns the organization served on the given host. The base host of the
-- instance is unknown here, so it and any other unknown host, such as that of
-- another instance, falls back to the default organization.
CREATE FUNCTION pg_temp.organization_served_on(host text) RETURNS uuid
    LANGUAGE sql STABLE AS
$$
SELECT coalesce(
    (
        SELECT guid
        FROM container
        WHERE payload->>'type' = 'organization'
            AND valid_currently
            AND NOT deleted
            AND (
                payload->>'customDomain' = host
                OR split_part(host, '.', 1) = guid::text
                OR (
                    NOT coalesce((payload->>'default')::boolean, false)
                    AND split_part(host, '.', 1) = lower(payload->>'slug')
                )
            )
        LIMIT 1
    ),
    pg_temp.default_organization()
)
$$;

-- Returns the href that refers to the page by guids, or null if the given
-- href does not point to a page. Relative hrefs are resolved on the host of
-- the given organization.
CREATE FUNCTION pg_temp.favorite_href(href text, context_organization uuid) RETURNS text
    LANGUAGE plpgsql STABLE AS
$$
DECLARE
    uuid_pattern constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
    parts text[];
    host_organization uuid;
    segments text[];
    search text;
    context_guid uuid;
    target_organization uuid;
BEGIN
    IF href LIKE 'knotdots://%' THEN
        RETURN href;
    END IF;

    parts := regexp_match(href, '^(?:[a-z][a-z0-9+.-]*://([^/?#]*))?([^?#]*)(\?[^#]*)?');

    IF parts IS NULL THEN
        RETURN NULL;
    END IF;

    IF parts[1] IS NULL THEN
        host_organization := context_organization;
    ELSE
        host_organization := pg_temp.organization_served_on(lower(split_part(parts[1], ':', 1)));
    END IF;

    IF host_organization IS NULL THEN
        RETURN NULL;
    END IF;

    segments := array_remove(string_to_array(parts[2], '/'), '');
    search := coalesce(nullif(parts[3], '?'), '');

    -- The root redirects to the page of the organization.
    IF cardinality(segments) = 0 THEN
        RETURN format('knotdots://%s/%s%s', host_organization, host_organization, search);
    END IF;

    IF segments[1] = 'me' THEN
        RETURN format('knotdots://%s/%s%s', host_organization, array_to_string(segments, '/'), search);
    END IF;

    IF segments[1] ~ uuid_pattern THEN
        SELECT guid, CASE WHEN payload->>'type' = 'organization' THEN guid ELSE organization END
        INTO context_guid, target_organization
        FROM container
        WHERE guid = segments[1]::uuid
            AND payload->>'type' IN ('organization', 'organizational_unit')
            AND valid_currently
            AND NOT deleted;
    ELSE
        -- Like the rewrite map, which only knows the slugs of the host's
        -- organization and its organizational units.
        SELECT guid, host_organization
        INTO context_guid, target_organization
        FROM container
        WHERE payload->>'slug' = segments[1]
            AND (
                (payload->>'type' = 'organization' AND guid = host_organization)
                OR (payload->>'type' = 'organizational_unit' AND organization = host_organization)
            )
            AND valid_currently
            AND NOT deleted
        LIMIT 1;

        -- Reordering used to replace the href with a relative one that has
        -- the slug of an organization or organizational unit as its first
        -- segment, but on the host of whichever organization it happened.
        -- Such an href is repaired if the slug is unambiguous.
        IF context_guid IS NULL AND parts[1] IS NULL THEN
            WITH candidate AS (
                SELECT guid, CASE WHEN payload->>'type' = 'organization' THEN guid ELSE organization END AS organization
                FROM container
                WHERE payload->>'slug' = segments[1]
                    AND payload->>'type' IN ('organization', 'organizational_unit')
                    AND valid_currently
                    AND NOT deleted
            )
            SELECT guid, organization
            INTO context_guid, target_organization
            FROM candidate
            WHERE (SELECT count(*) FROM candidate) = 1;
        END IF;
    END IF;

    IF context_guid IS NULL THEN
        RETURN NULL;
    END IF;

    segments[1] := context_guid::text;

    RETURN format('knotdots://%s/%s%s', target_organization, array_to_string(segments, '/'), search);
END
$$;

CREATE FUNCTION pg_temp.favorites_by_guids(favorites jsonb, context_organization uuid) RETURNS jsonb
    LANGUAGE sql STABLE AS
$$
WITH converted AS (
    SELECT
        position,
        jsonb_set(favorite, '{href}', to_jsonb(pg_temp.favorite_href(favorite->>'href', context_organization))) AS favorite
    FROM jsonb_array_elements(favorites) WITH ORDINALITY AS f(favorite, position)
    WHERE jsonb_typeof(favorite->'href') = 'string'
), deduplicated AS (
    SELECT DISTINCT ON (favorite->>'href') position, favorite
    FROM converted
    WHERE jsonb_typeof(favorite->'href') = 'string'
    ORDER BY favorite->>'href', position
)
SELECT coalesce(jsonb_agg(favorite ORDER BY position), '[]')
FROM deduplicated
$$;

-- All revisions are updated, so that earlier revisions still match the schema.
UPDATE container
SET payload = jsonb_set(payload, '{favorite}', pg_temp.favorites_by_guids(payload->'favorite', guid))
WHERE payload->>'type' = 'organization'
    AND jsonb_typeof(payload->'favorite') = 'array';

UPDATE container
SET payload = jsonb_set(payload, '{platformFavorite}', pg_temp.favorites_by_guids(payload->'platformFavorite', guid))
WHERE payload->>'type' = 'organization'
    AND jsonb_typeof(payload->'platformFavorite') = 'array';

UPDATE container
SET payload = jsonb_set(payload, '{favorite}', pg_temp.favorites_by_guids(payload->'favorite', organization))
WHERE payload->>'type' = 'organizational_unit'
    AND jsonb_typeof(payload->'favorite') = 'array';

UPDATE "user"
SET settings = jsonb_set(settings, '{favorite}', pg_temp.favorites_by_guids(settings->'favorite', pg_temp.default_organization()))
WHERE jsonb_typeof(settings->'favorite') = 'array';

COMMIT;
