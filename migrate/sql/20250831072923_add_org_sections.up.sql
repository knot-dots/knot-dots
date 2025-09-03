WITH organizations AS (
    SELECT DISTINCT co.guid, co.payload, co.realm, co.organization
    FROM container ci
    JOIN container co ON ci.organization = co.guid
    WHERE ci.payload->>'type' ='indicator'
        AND NOT (co.payload->'default')::boolean
        AND ci.valid_currently
        AND co.valid_currently
        AND NOT ci.deleted
        AND NOT co.deleted
), sections AS (
    INSERT INTO container_relation (object, position, predicate, subject)
    SELECT guid, 0, 'is-section-of', gen_random_uuid()
    FROM organizations
    RETURNING object, subject
)
INSERT INTO container (guid, payload, realm, organization, organizational_unit, managed_by)
SELECT s.subject, jsonb_build_object('title', 'Indikatoren', 'type', 'indicator_collection', 'visibility', o.payload->>'visibility'), o.realm, o.organization, NULL, o.organization
FROM organizations o JOIN sections s ON o.guid = s.object;

WITH organizations AS (
    SELECT DISTINCT co.guid, co.payload, co.realm, co.organization
    FROM container cm
    JOIN container co ON cm.organization = co.guid
    WHERE cm.payload->>'type' IN ('measure', 'simple_measure')
        AND NOT (co.payload->'default')::boolean
        AND cm.valid_currently
        AND co.valid_currently
        AND NOT cm.deleted
        AND NOT co.deleted
), sections AS (
    INSERT INTO container_relation (object, position, predicate, subject)
    SELECT guid, 1, 'is-section-of', gen_random_uuid()
    FROM organizations
    RETURNING object, subject
)
INSERT INTO container (guid, payload, realm, organization, organizational_unit, managed_by)
SELECT s.subject, jsonb_build_object('title', 'Maßnahmen', 'type', 'measure_collection', 'visibility', o.payload->> 'visibility'), o.realm, o.organization, NULL, o.organization
FROM organizations o JOIN sections s ON o.guid = s.object;

WITH organizations AS (
    SELECT DISTINCT co.guid, co.payload, co.realm, co.organization
    FROM container cp
    JOIN container co ON cp.organization = co.guid
    WHERE cp.payload->>'type' ='program'
        AND NOT (co.payload->'default')::boolean
        AND cp.valid_currently
        AND co.valid_currently
        AND NOT cp.deleted
        AND NOT co.deleted
), sections AS (
    INSERT INTO container_relation (object, position, predicate, subject)
    SELECT guid, 2, 'is-section-of', gen_random_uuid()
    FROM organizations
    RETURNING object, subject
)
INSERT INTO container (guid, payload, realm, organization, organizational_unit, managed_by)
SELECT s.subject, jsonb_build_object('title', 'Programme', 'type', 'program_collection', 'visibility', o.payload->> 'visibility'), o.realm, o.organization, NULL, o.organization
FROM organizations o JOIN sections s ON o.guid = s.object;

WITH organizational_units AS (
    SELECT DISTINCT co.guid, co.payload, co.realm, co.organization
    FROM container ci
    JOIN container co ON ci.organizational_unit = co.guid
    WHERE ci.payload->>'type' ='indicator'
        AND ci.valid_currently
        AND co.valid_currently
        AND NOT ci.deleted
        AND NOT co.deleted
), sections AS (
    INSERT INTO container_relation (object, position, predicate, subject)
    SELECT guid, 0, 'is-section-of', gen_random_uuid()
    FROM organizational_units
    RETURNING object, subject
)
INSERT INTO container (guid, payload, realm, organization, organizational_unit, managed_by)
SELECT s.subject, jsonb_build_object('title', 'Indikatoren', 'type', 'indicator_collection', 'visibility', o.payload->>'visibility'), o.realm, o.organization, o.guid, o.organization
FROM organizational_units o JOIN sections s ON o.guid = s.object;

WITH organizational_units AS (
    SELECT DISTINCT co.guid, co.payload, co.realm, co.organization
    FROM container cm
    JOIN container co ON cm.organizational_unit = co.guid
    WHERE cm.payload->>'type' IN ('measure', 'simple_measure')
        AND cm.valid_currently
        AND co.valid_currently
        AND NOT cm.deleted
        AND NOT co.deleted
), sections AS (
    INSERT INTO container_relation (object, position, predicate, subject)
    SELECT guid, 1, 'is-section-of', gen_random_uuid()
    FROM organizational_units
    RETURNING object, subject
)
INSERT INTO container (guid, payload, realm, organization, organizational_unit, managed_by)
SELECT s.subject, jsonb_build_object('title', 'Maßnahmen', 'type', 'measure_collection', 'visibility', o.payload->> 'visibility'), o.realm, o.organization, o.guid, o.organization
FROM organizational_units o JOIN sections s ON o.guid = s.object;

WITH organizational_units AS (
    SELECT DISTINCT co.guid, co.payload, co.realm, co.organization
    FROM container cp
    JOIN container co ON cp.organizational_unit = co.guid
    WHERE cp.payload->>'type' ='program'
        AND cp.valid_currently
        AND co.valid_currently
        AND NOT cp.deleted
        AND NOT co.deleted
), sections AS (
    INSERT INTO container_relation (object, position, predicate, subject)
    SELECT guid, 2, 'is-section-of', gen_random_uuid()
    FROM organizational_units
    RETURNING object, subject
)
INSERT INTO container (guid, payload, realm, organization, organizational_unit, managed_by)
SELECT s.subject, jsonb_build_object('title', 'Programme', 'type', 'program_collection', 'visibility', o.payload->> 'visibility'), o.realm, o.organization, o.guid, o.organization
FROM organizational_units o JOIN sections s ON o.guid = s.object;
