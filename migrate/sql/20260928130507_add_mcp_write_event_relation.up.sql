BEGIN;

-- Relation changes have no revision. They record the relation instead:
-- container_guid is its subject, related_container_guid its object.
ALTER TABLE mcp_write_event
    ADD COLUMN predicate text CHECK (btrim(predicate) <> ''),
    ADD COLUMN related_container_guid uuid,
    ADD CONSTRAINT mcp_write_event_relation_check
        CHECK ((predicate IS NULL) = (related_container_guid IS NULL));

COMMIT;
