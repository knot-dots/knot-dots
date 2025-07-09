UPDATE container SET payload = jsonb_set(payload, '{ruleStatus}', '"rule_status.idea"') WHERE payload->>'ruleStatus' = 'rule_status.draft';
UPDATE container SET payload = jsonb_set(payload, '{ruleStatus}', '"rule_status.adopted"') WHERE payload->>'ruleStatus' = 'rule_status.in_force';
