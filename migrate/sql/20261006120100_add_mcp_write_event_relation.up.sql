BEGIN;

-- Relation changes have no revision. They record the relation instead:
-- container_guid is its subject, related_container_guid its object.
-- Idempotent because databases that ran this migration under its previous,
-- older version already have the columns and the constraint.
ALTER TABLE mcp_write_event
    ADD COLUMN IF NOT EXISTS predicate text CHECK (btrim(predicate) <> ''),
    ADD COLUMN IF NOT EXISTS related_container_guid uuid;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'mcp_write_event_relation_check'
            AND conrelid = 'mcp_write_event'::regclass
    ) THEN
        ALTER TABLE mcp_write_event
            ADD CONSTRAINT mcp_write_event_relation_check
                CHECK ((predicate IS NULL) = (related_container_guid IS NULL));
    END IF;
END
$$;

COMMIT;
