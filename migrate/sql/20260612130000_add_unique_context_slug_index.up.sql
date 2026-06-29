BEGIN;

CREATE UNIQUE INDEX container_payload_organization_slug_unique_idx ON container (lower(payload->>'slug'))
WHERE
	valid_currently
	AND NOT deleted
	AND payload ? 'slug'
	AND payload->>'slug' <> ''
	AND payload->>'type' = 'organization';

CREATE UNIQUE INDEX container_payload_organizational_unit_slug_per_org_unique_idx ON container (
	organization,
	lower(payload->>'slug')
)
WHERE
	valid_currently
	AND NOT deleted
	AND payload ? 'slug'
	AND payload->>'slug' <> ''
	AND payload->>'type' = 'organizational_unit';

COMMIT;