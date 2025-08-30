DELETE FROM container_relation cr WHERE EXISTS (
    SELECT guid
    FROM container c
    WHERE c.payload->>'type' IN ('indicator_collection', 'measure_collection', 'program_collection')
        AND cr.subject = c.guid
);
DELETE FROM container WHERE payload->>'type' IN ('indicator_collection', 'measure_collection', 'program_collection')
