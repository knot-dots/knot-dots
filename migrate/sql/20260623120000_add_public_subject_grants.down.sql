DELETE FROM container_permission
WHERE subject = '00000000-0000-0000-0000-000000000000'
  AND predicate = 'is-member-of'
  AND object IN (
    SELECT c.guid
    FROM container c
    WHERE c.valid_currently
      AND NOT c.deleted
      AND c.payload->>'visibility' = 'public'
  );
