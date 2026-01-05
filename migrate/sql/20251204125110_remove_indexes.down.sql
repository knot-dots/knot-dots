BEGIN;

CREATE INDEX container_payload_idx ON container USING gin (payload);
CREATE INDEX container_valid_from_idx ON container (valid_from);
CREATE INDEX container_realm_idx ON container (realm);
CREATE INDEX container_payload_title_idx ON container ((payload->>'title'));
CREATE INDEX container_payload_strategy_type_idx ON container ((payload->>'strategyType'));
CREATE INDEX container_payload_organization_category_idx ON container ((payload->>'organizationCategory'));
CREATE INDEX container_relation_valid_from_idx ON container_relation (valid_from);
CREATE INDEX idx_container_relation_subject_predicate_idx ON container_relation (subject, predicate, valid_currently, deleted) WHERE valid_currently = true AND deleted = false;

COMMIT;
