BEGIN;

UPDATE container
SET payload = jsonb_set(payload, '{aiContribution}', '1', true)
WHERE payload ? 'aiSuggestion' AND payload->'aiSuggestion' = to_jsonb(true);

UPDATE container c1
SET payload = jsonb_set(payload, '{aiContribution}', '0.5', true)
WHERE payload ? 'aiSuggestion' AND payload->'aiSuggestion' = to_jsonb(true) AND (SELECT COUNT(*) FROM container c2 WHERE c2.guid = c1.guid AND c2.revision < c1.revision) > 0;

UPDATE container
SET payload = jsonb_set(payload, '{aiContribution}', '0', true)
WHERE payload ? 'aiSuggestion' AND payload->'aiSuggestion' = to_jsonb(false);

COMMIT;
