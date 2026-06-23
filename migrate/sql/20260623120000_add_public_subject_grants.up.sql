-- Seed the public pseudo-subject for all currently public containers.
INSERT INTO container_permission (object, subject, predicate)
SELECT c.guid,
       '00000000-0000-0000-0000-000000000000',
       'is-member-of'
FROM container c
WHERE c.valid_currently
  AND NOT c.deleted
  AND c.payload->>'visibility' = 'public'
ON CONFLICT (object, subject, predicate) DO NOTHING;
