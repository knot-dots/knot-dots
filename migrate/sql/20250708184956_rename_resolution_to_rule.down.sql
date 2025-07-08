UPDATE container SET payload = jsonb_set(payload, '{type}', '"resolution"') WHERE payload->>'type' = 'rule';
UPDATE container SET payload = jsonb_set(payload, '{resolutionStatus}', payload->'ruleStatus', true) WHERE payload->>'type' = 'resolution';
UPDATE container SET payload = payload - 'ruleStatus' WHERE payload->>'type' = 'resolution';
UPDATE container SET payload = jsonb_set(payload, '{resolutionStatus}', '"resolution_status.draft"') WHERE payload->>'resolutionStatus' = 'rule_status.draft';
UPDATE container SET payload = jsonb_set(payload, '{resolutionStatus}', '"resolution_status.in_force"') WHERE payload->>'resolutionStatus' = 'rule_status.in_force';
UPDATE container SET payload = jsonb_set(payload, '{resolutionStatus}', '"resolution_status.invalid"') WHERE payload->>'resolutionStatus' = 'rule_status.invalid';
UPDATE container SET payload = jsonb_set(payload, '{resolutionStatus}', '"resolution_status.rejected"') WHERE payload->>'resolutionStatus' = 'rule_status.rejected';
UPDATE container SET payload = jsonb_set(payload, '{"chapterType"}', (payload->'chapterType' || '["resolution"]'::jsonb)) WHERE payload->'chapterType' ?| array['rule'];
UPDATE container SET payload = jsonb_set(payload, '{"chapterType"}', (payload->'chapterType') - 'rule') WHERE payload->'chapterType' ?| array['rule'];
