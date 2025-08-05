WITH measures AS (
    SELECT *
    FROM container m
    WHERE payload->>'type' = 'simple_measure' AND payload->'file' <> '[]'::jsonb AND valid_currently
), sections AS (
    INSERT INTO container_relation (object, position, predicate, subject)
        SELECT m.guid, 0, 'is-section-of', gen_random_uuid()
        FROM measures m
        RETURNING object, subject
)
INSERT INTO container (guid, payload, realm, organization, organizational_unit, managed_by)
SELECT source.subject,jsonb_build_object('file', jsonb_agg(jsonb_build_object('name', f->1, 'size', 0, 'type', 'application/octet-stream', 'url', f->0)), 'title', 'Dateien', 'type', 'file_collection', 'visibility', source.visibility), source.realm, source.organization, source.organizational_unit, source.managed_by
FROM (
    SELECT s.subject, m.payload, m.payload->>'visibility' AS visibility, m.realm, m.organization, m.organizational_unit, m.managed_by
    FROM measures m JOIN sections s ON m.guid = s.object
) AS source, jsonb_array_elements(source.payload->'file') AS f
GROUP BY source.subject, source.visibility, source.realm, source.organization, source.organizational_unit, source.managed_by;
