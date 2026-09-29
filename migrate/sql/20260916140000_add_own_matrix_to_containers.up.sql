-- Whether the grant inheritance restarts at this container: a container with
-- a matrix of its own does not follow the surrounding scope's matrix but
-- governs itself and everything below it. Containers that already carry grant
-- rows keep their matrix; the rest inherit from their surroundings.
ALTER TABLE container ADD COLUMN own_matrix boolean NOT NULL DEFAULT false;

UPDATE container
SET own_matrix = true
WHERE payload->>'type' IN ('measure', 'organizational_unit', 'program', 'simple_measure')
	AND EXISTS (
		SELECT 1 FROM container_grant g WHERE g.object = container.guid
	);
