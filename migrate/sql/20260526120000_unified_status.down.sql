-- Revert goals: status -> goalStatus
UPDATE container
SET payload = jsonb_set(payload - 'status', '{goalStatus}', '"goal_status.idea"')
WHERE payload->>'type' = 'goal' AND payload->>'status' = 'status.idea';

UPDATE container
SET payload = jsonb_set(payload - 'status', '{goalStatus}', '"goal_status.in_planning"')
WHERE payload->>'type' = 'goal' AND payload->>'status' = 'status.in_planning';

UPDATE container
SET payload = jsonb_set(payload - 'status', '{goalStatus}', '"goal_status.achieved"')
WHERE payload->>'type' = 'goal' AND payload->>'status' = 'status.done';

UPDATE container
SET payload = jsonb_set(payload - 'status', '{goalStatus}', '"goal_status.rejected"')
WHERE payload->>'type' = 'goal' AND payload->>'status' = 'status.rejected';

-- Revert tasks: status -> taskStatus
UPDATE container
SET payload = jsonb_set(payload - 'status', '{taskStatus}', '"task_status.idea"')
WHERE payload->>'type' = 'task' AND payload->>'status' = 'status.idea';

UPDATE container
SET payload = jsonb_set(payload - 'status', '{taskStatus}', '"task_status.in_planning"')
WHERE payload->>'type' = 'task' AND payload->>'status' = 'status.in_planning';

UPDATE container
SET payload = jsonb_set(payload - 'status', '{taskStatus}', '"task_status.in_progress"')
WHERE payload->>'type' = 'task' AND payload->>'status' = 'status.in_implementation';

UPDATE container
SET payload = jsonb_set(payload - 'status', '{taskStatus}', '"task_status.done"')
WHERE payload->>'type' = 'task' AND payload->>'status' = 'status.done';

UPDATE container
SET payload = jsonb_set(payload - 'status', '{taskStatus}', '"task_status.rejected"')
WHERE payload->>'type' = 'task' AND payload->>'status' = 'status.rejected';

-- Revert programs: status -> programStatus
UPDATE container
SET payload = jsonb_set(payload - 'status', '{programStatus}', '"program_status.idea"')
WHERE payload->>'type' = 'program' AND payload->>'status' = 'status.idea';

UPDATE container
SET payload = jsonb_set(payload - 'status', '{programStatus}', '"program_status.in_planning"')
WHERE payload->>'type' = 'program' AND payload->>'status' = 'status.in_planning';

UPDATE container
SET payload = jsonb_set(payload - 'status', '{programStatus}', '"program_status.in_implementation"')
WHERE payload->>'type' = 'program' AND payload->>'status' = 'status.in_implementation';

UPDATE container
SET payload = jsonb_set(payload - 'status', '{programStatus}', '"program_status.done"')
WHERE payload->>'type' = 'program' AND payload->>'status' = 'status.done';

UPDATE container
SET payload = jsonb_set(payload - 'status', '{programStatus}', '"program_status.rejected"')
WHERE payload->>'type' = 'program' AND payload->>'status' = 'status.rejected';

-- Revert rules: status -> ruleStatus
UPDATE container
SET payload = jsonb_set(payload - 'status', '{ruleStatus}', '"rule_status.idea"')
WHERE payload->>'type' = 'rule' AND payload->>'status' = 'status.idea';

UPDATE container
SET payload = jsonb_set(payload - 'status', '{ruleStatus}', '"rule_status.in_planning"')
WHERE payload->>'type' = 'rule' AND payload->>'status' = 'status.in_planning';

UPDATE container
SET payload = jsonb_set(payload - 'status', '{ruleStatus}', '"rule_status.rejected"')
WHERE payload->>'type' = 'rule' AND payload->>'status' = 'status.rejected';
