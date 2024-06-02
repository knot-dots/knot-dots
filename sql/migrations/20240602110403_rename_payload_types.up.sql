UPDATE container SET payload['type'] = to_jsonb('milestone'::text) WHERE payload->>'type' = 'internal_objective.milestone';
UPDATE container SET payload['type'] = to_jsonb('measure_result'::text) WHERE payload->>'type' = 'internal_objective.strategic_goal';
UPDATE container SET payload['type'] = to_jsonb('task'::text) WHERE payload->>'type' = 'internal_objective.task';
UPDATE container SET payload['type'] = to_jsonb('vision'::text) WHERE payload->>'type' = 'internal_objective.vision';
