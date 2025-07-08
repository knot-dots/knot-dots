UPDATE container SET payload = jsonb_set(payload, '{type}', '"rule"') WHERE payload->>'type' = 'resolution';
UPDATE container SET payload = jsonb_set(payload, '{ruleStatus}', payload->'resolutionStatus', true) WHERE payload->>'type' = 'rule';
UPDATE container SET payload = payload - 'resolutionStatus' WHERE payload->>'type' = 'rule';
UPDATE container SET payload = jsonb_set(payload, '{ruleStatus}', '"rule_status.draft"') WHERE payload->>'ruleStatus' = 'resolution_status.draft';
UPDATE container SET payload = jsonb_set(payload, '{ruleStatus}', '"rule_status.in_force"') WHERE payload->>'ruleStatus' = 'resolution_status.in_force';
UPDATE container SET payload = jsonb_set(payload, '{ruleStatus}', '"rule_status.invalid"') WHERE payload->>'ruleStatus' = 'resolution_status.invalid';
UPDATE container SET payload = jsonb_set(payload, '{ruleStatus}', '"rule_status.rejected"') WHERE payload->>'ruleStatus' = 'resolution_status.rejected';
UPDATE container SET payload = jsonb_set(payload, '{"chapterType"}', (payload->'chapterType' || '["rule"]'::jsonb)) WHERE payload->'chapterType' ?| array['resolution'];
UPDATE container SET payload = jsonb_set(payload, '{"chapterType"}', (payload->'chapterType') - 'resolution') WHERE payload->'chapterType' ?| array['resolution'];
