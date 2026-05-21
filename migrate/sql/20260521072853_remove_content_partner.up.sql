BEGIN;

DELETE FROM container_user
WHERE object IN (SELECT revision FROM container WHERE payload->>'type' IN ('content_partner', 'content_partner_collection'));

DELETE FROM container_relation
WHERE subject IN (SELECT guid FROM container WHERE payload->>'type' IN ('content_partner', 'content_partner_collection'))
   OR object IN (SELECT guid FROM container WHERE payload->>'type' IN ('content_partner', 'content_partner_collection'));

DELETE FROM container
WHERE payload->>'type' IN ('content_partner', 'content_partner_collection');

COMMIT;
