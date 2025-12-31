BEGIN;

-- Unused indexes according to pg_stat_user_indexes
DROP INDEX container_payload_idx;
DROP INDEX container_valid_from_idx;
DROP INDEX container_realm_idx;
DROP INDEX container_payload_title_idx;
DROP INDEX container_payload_strategy_type_idx;
DROP INDEX container_payload_organization_category_idx;
DROP INDEX container_relation_valid_from_idx;
-- Redundant index according to EXPLAIN ANALYZE
DROP INDEX idx_container_relation_subject_predicate_idx;

COMMIT;
