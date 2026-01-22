BEGIN;

UPDATE container c SET organization = p.organization, organizational_unit = p.organizational_unit
FROM container p
JOIN container_relation cr ON cr.object = p.guid
WHERE cr.predicate = 'is-section-of'
  AND cr.subject = c.guid
  AND (c.organization <> p.organization OR c.organizational_unit <> p.organizational_unit)
  AND c.valid_currently
  AND p.valid_currently
  AND cr.valid_currently
  AND NOT cr.deleted;

COMMIT;
