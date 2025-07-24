DELETE FROM container_relation WHERE predicate = 'is-section-of';
DELETE FROM container WHERE payload->>'type' IN ('effect_collection', 'goal_collection', 'objective_collection', 'resource_collection', 'task_collection');
