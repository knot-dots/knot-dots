WITH candidates AS (
  SELECT c.guid,
         c.payload->>'type' AS container_payload_type,
         c.organization,
         c.organizational_unit,
         c.managed_by,
         m.payload->>'type' AS managed_by_type
  FROM container c
  LEFT JOIN container m ON m.guid = c.managed_by
  WHERE (c.payload->>'type') NOT IN ('organization','organizational_unit')
    AND c.valid_currently IS TRUE
)
UPDATE container AS c
SET managed_by = COALESCE(c.organizational_unit, c.organization)
FROM candidates AS cand
WHERE c.guid = cand.guid
  -- Only update when current managed_by points to an organization or organizational_unit
  AND cand.managed_by_type IN ('organization','organizational_unit')
  -- And target value is not null (avoid violating NOT NULL constraint)
  AND COALESCE(c.organizational_unit, c.organization) IS NOT NULL
  -- And it's actually different
  AND c.managed_by IS DISTINCT FROM COALESCE(c.organizational_unit, c.organization)
  -- And it is the current version
  AND c.valid_currently IS TRUE;
