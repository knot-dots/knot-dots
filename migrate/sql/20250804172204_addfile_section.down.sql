DELETE FROM container_relation WHERE predicate = 'is-section-of';
DELETE FROM container WHERE payload->>'type' IN ('file_collection');
