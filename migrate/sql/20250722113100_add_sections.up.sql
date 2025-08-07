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

WITH measures AS (
    SELECT *
    FROM container m
    WHERE payload->>'type' IN ('measure', 'simple_measure') AND payload->>'annotation' <> '' AND valid_currently
), sections AS (
    INSERT INTO container_relation (object, position, predicate, subject)
        SELECT m.guid, 1, 'is-section-of', gen_random_uuid()
        FROM measures m
        RETURNING object, subject
)
INSERT INTO container (guid, payload, realm, organization, organizational_unit, managed_by)
SELECT s.subject, jsonb_build_object('body', m.payload->>'annotation', 'title', 'Anmerkungen', 'type', 'text', 'visibility', m.payload->>'visibility'), m.realm, m.organization, m.organizational_unit, m.managed_by
FROM measures m JOIN sections s ON m.guid = s.object;

WITH measures AS (
    SELECT *
    FROM container m
    WHERE payload->>'type' IN ('measure', 'simple_measure') AND payload->>'comment' <> '' AND valid_currently
), sections AS (
    INSERT INTO container_relation (object, position, predicate, subject)
        SELECT m.guid, 2, 'is-section-of', gen_random_uuid()
        FROM measures m
        RETURNING object, subject
)
INSERT INTO container (guid, payload, realm, organization, organizational_unit, managed_by)
SELECT s.subject, jsonb_build_object('body', m.payload->>'comment', 'title', 'Kommentar', 'type', 'text', 'visibility', m.payload->>'visibility'), m.realm, m.organization, m.organizational_unit, m.managed_by
FROM measures m JOIN sections s ON m.guid = s.object;

WITH measures AS (
    SELECT *
    FROM container m
    WHERE payload->>'type' IN ('measure', 'simple_measure') AND payload->>'result' <> '' AND valid_currently
), sections AS (
    INSERT INTO container_relation (object, position, predicate, subject)
        SELECT m.guid, 3, 'is-section-of', gen_random_uuid()
        FROM measures m
        RETURNING object, subject
)
INSERT INTO container (guid, payload, realm, organization, organizational_unit, managed_by)
SELECT s.subject, jsonb_build_object('body', m.payload->>'result', 'title', 'Ergebnis', 'type', 'text', 'visibility', m.payload->>'visibility'), m.realm, m.organization, m.organizational_unit, m.managed_by
FROM measures m JOIN sections s ON m.guid = s.object;

WITH measures AS (
    SELECT *
    FROM container m
    WHERE payload->>'type' IN ('measure', 'simple_measure') AND valid_currently AND EXISTS (
        SELECT 1
        FROM container g JOIN container_relation r ON g.guid = r.subject
        WHERE g.payload->>'type' = 'resource'
          AND r.object = m.guid
          AND r.predicate IN ('is-part-of', 'is-part-of-measure')
          AND g.valid_currently = true
    )
), sections AS (
    INSERT INTO container_relation (object, position, predicate, subject)
        SELECT m.guid, 4, 'is-section-of', gen_random_uuid()
        FROM measures m
        RETURNING object, subject
)
INSERT INTO container (guid, payload, realm, organization, organizational_unit, managed_by)
SELECT s.subject, jsonb_build_object('title', 'Ressourcen', 'type', 'resource_collection', 'visibility', m.payload->>'visibility'), m.realm, m.organization, m.organizational_unit, m.managed_by
FROM measures m JOIN sections s ON m.guid = s.object;

WITH measures AS (
    SELECT *
    FROM container m
    WHERE payload->>'type' IN ('measure', 'simple_measure') AND valid_currently AND EXISTS (
        SELECT 1
        FROM container g JOIN container_relation r ON g.guid = r.subject
        WHERE g.payload->>'type' = 'goal'
          AND r.object = m.guid
          AND r.predicate IN ('is-part-of', 'is-part-of-measure')
          AND g.valid_currently = true
    )
), sections AS (
    INSERT INTO container_relation (object, position, predicate, subject)
        SELECT m.guid, 5, 'is-section-of', gen_random_uuid()
        FROM measures m
        RETURNING object, subject
)
INSERT INTO container (guid, payload, realm, organization, organizational_unit, managed_by)
SELECT s.subject, jsonb_build_object('title', 'Ziele', 'type', 'goal_collection', 'visibility', m.payload->>'visibility'), m.realm, m.organization, m.organizational_unit, m.managed_by
FROM measures m JOIN sections s ON m.guid = s.object;

WITH goals AS (
    SELECT *
    FROM container m
    WHERE payload->>'type' = 'goal' AND valid_currently AND EXISTS (
        SELECT 1
        FROM container g JOIN container_relation r ON g.guid = r.subject
        WHERE g.payload->>'type' = 'effect'
          AND r.object = m.guid
          AND r.predicate = 'is-part-of'
          AND g.valid_currently = true
    )
), sections AS (
    INSERT INTO container_relation (object, position, predicate, subject)
        SELECT g.guid, 0, 'is-section-of', gen_random_uuid()
        FROM goals g
        RETURNING object, subject
)
INSERT INTO container (guid, payload, realm, organization, organizational_unit, managed_by)
SELECT s.subject,jsonb_build_object('title', 'Wirkung', 'type', 'effect_collection', 'visibility', g.payload->> 'visibility'),g.realm,g.organization,g.organizational_unit,g.managed_by
FROM goals g JOIN sections s ON g.guid = s.object;

WITH goals AS (
    SELECT *
    FROM container m
    WHERE payload->>'type' = 'goal' AND valid_currently AND EXISTS (
        SELECT 1
        FROM container g JOIN container_relation r ON g.guid = r.subject
        WHERE g.payload->>'type' = 'objective'
          AND r.object = m.guid
          AND r.predicate = 'is-part-of'
          AND g.valid_currently = true
    )
), sections AS (
    INSERT INTO container_relation (object, position, predicate, subject)
        SELECT g.guid, 0, 'is-section-of', gen_random_uuid()
        FROM goals g
        RETURNING object, subject
)
INSERT INTO container (guid, payload, realm, organization, organizational_unit, managed_by)
SELECT s.subject,jsonb_build_object('title', 'Gewünschte Entwicklung', 'type', 'objective_collection', 'visibility', g.payload->> 'visibility'),g.realm,g.organization,g.organizational_unit,g.managed_by
FROM goals g JOIN sections s ON g.guid = s.object;

WITH goals AS (
    SELECT *
    FROM container m
    WHERE payload->>'type' = 'goal' AND valid_currently AND EXISTS (
        SELECT 1
        FROM container g JOIN container_relation r ON g.guid = r.subject
        WHERE g.payload->>'type' = 'task'
          AND r.object = m.guid
          AND r.predicate = 'is-part-of'
          AND g.valid_currently = true
    )
), sections AS (
    INSERT INTO container_relation (object, position, predicate, subject)
        SELECT g.guid, 1, 'is-section-of', gen_random_uuid()
        FROM goals g
        RETURNING object, subject
)
INSERT INTO container (guid, payload, realm, organization, organizational_unit, managed_by)
SELECT s.subject, jsonb_build_object('title', 'Aufgaben', 'type', 'task_collection', 'visibility', g.payload->>'visibility'), g.realm, g.organization, g.organizational_unit, g.managed_by
FROM goals g JOIN sections s ON g.guid = s.object;
