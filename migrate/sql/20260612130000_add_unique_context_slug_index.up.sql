CREATE UNIQUE INDEX container_payload_context_slug_unique_idx ON container (lower(payload->>'slug'))
WHERE
	valid_currently
	AND NOT deleted
	AND payload ? 'slug'
	AND payload->>'slug' <> ''
	AND payload->>'type' IN ('organization', 'organizational_unit');
