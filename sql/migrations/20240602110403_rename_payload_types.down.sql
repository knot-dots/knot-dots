UPDATE container SET payload['type'] = to_jsonb('internal_objective.milestone'::text) WHERE payload->>'type' = 'milestone';
UPDATE container SET payload['type'] = to_jsonb('internal_objective.strategic_goal'::text) WHERE payload->>'type' = 'measure_result';
UPDATE container SET payload['type'] = to_jsonb('internal_objective.task'::text) WHERE payload->>'type' = 'task';
UPDATE container SET payload['type'] = to_jsonb('internal_objective.vision'::text) WHERE payload->>'type' = 'vision';
