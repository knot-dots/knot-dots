-- Migrate goalStatus -> status
UPDATE container
SET payload = jsonb_set(payload - 'goalStatus', '{status}', '"status.idea"')
WHERE payload->>'type' = 'goal' AND payload->>'goalStatus' = 'goal_status.idea';

UPDATE container
SET payload = jsonb_set(payload - 'goalStatus', '{status}', '"status.in_planning"')
WHERE payload->>'type' = 'goal' AND payload->>'goalStatus' IN ('goal_status.in_planning', 'goal_status.adopted');

UPDATE container
SET payload = jsonb_set(payload - 'goalStatus', '{status}', '"status.done"')
WHERE payload->>'type' = 'goal' AND payload->>'goalStatus' = 'goal_status.achieved';

UPDATE container
SET payload = jsonb_set(payload - 'goalStatus', '{status}', '"status.rejected"')
WHERE payload->>'type' = 'goal' AND payload->>'goalStatus' = 'goal_status.rejected';

-- Migrate taskStatus -> status
UPDATE container
SET payload = jsonb_set(payload - 'taskStatus', '{status}', '"status.idea"')
WHERE payload->>'type' = 'task' AND payload->>'taskStatus' = 'task_status.idea';

UPDATE container
SET payload = jsonb_set(payload - 'taskStatus', '{status}', '"status.in_planning"')
WHERE payload->>'type' = 'task' AND payload->>'taskStatus' = 'task_status.in_planning';

UPDATE container
SET payload = jsonb_set(payload - 'taskStatus', '{status}', '"status.in_implementation"')
WHERE payload->>'type' = 'task' AND payload->>'taskStatus' = 'task_status.in_progress';

UPDATE container
SET payload = jsonb_set(payload - 'taskStatus', '{status}', '"status.done"')
WHERE payload->>'type' = 'task' AND payload->>'taskStatus' = 'task_status.done';

UPDATE container
SET payload = jsonb_set(payload - 'taskStatus', '{status}', '"status.rejected"')
WHERE payload->>'type' = 'task' AND payload->>'taskStatus' = 'task_status.rejected';

-- Migrate programStatus -> status
UPDATE container
SET payload = jsonb_set(payload - 'programStatus', '{status}', '"status.idea"')
WHERE payload->>'type' = 'program' AND payload->>'programStatus' = 'program_status.idea';

UPDATE container
SET payload = jsonb_set(payload - 'programStatus', '{status}', '"status.in_planning"')
WHERE payload->>'type' = 'program' AND payload->>'programStatus' IN ('program_status.in_planning', 'program_status.adopted');

UPDATE container
SET payload = jsonb_set(payload - 'programStatus', '{status}', '"status.in_implementation"')
WHERE payload->>'type' = 'program' AND payload->>'programStatus' = 'program_status.in_implementation';

UPDATE container
SET payload = jsonb_set(payload - 'programStatus', '{status}', '"status.done"')
WHERE payload->>'type' = 'program' AND payload->>'programStatus' = 'program_status.done';

UPDATE container
SET payload = jsonb_set(payload - 'programStatus', '{status}', '"status.rejected"')
WHERE payload->>'type' = 'program' AND payload->>'programStatus' = 'program_status.rejected';

-- Migrate ruleStatus -> status
UPDATE container
SET payload = jsonb_set(payload - 'ruleStatus', '{status}', '"status.idea"')
WHERE payload->>'type' = 'rule' AND payload->>'ruleStatus' = 'rule_status.idea';

UPDATE container
SET payload = jsonb_set(payload - 'ruleStatus', '{status}', '"status.in_planning"')
WHERE payload->>'type' = 'rule' AND payload->>'ruleStatus' IN ('rule_status.in_planning', 'rule_status.adopted');

UPDATE container
SET payload = jsonb_set(payload - 'ruleStatus', '{status}', '"status.rejected"')
WHERE payload->>'type' = 'rule' AND payload->>'ruleStatus' = 'rule_status.rejected';

-- Migrate existing measure/simple_measure status values (drop status.adopted)
UPDATE container
SET payload = jsonb_set(payload, '{status}', '"status.in_planning"')
WHERE payload->>'type' IN ('measure', 'simple_measure') AND payload->>'status' = 'status.adopted';
