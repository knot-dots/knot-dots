-- Containers with a grant matrix take part in inheritance: those that already
-- carry a matrix of their own keep it (decoupled), the rest inherit from
-- their surroundings. Without this, the payload default of true would let
-- existing rows fall dormant on the next save.
UPDATE container
SET payload = jsonb_set(payload, '{inheritsGrants}', to_jsonb(NOT EXISTS (
	SELECT 1 FROM container_grant g WHERE g.object = container.guid
)))
WHERE payload->>'type' IN ('measure', 'organizational_unit', 'program', 'simple_measure')
	AND NOT payload ? 'inheritsGrants';
