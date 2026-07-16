BEGIN;

-- managed_by is no longer a stored authorization input. It is computed at read
-- time from the program/measure hierarchy and team memberships. The physical
-- column is renamed (kept as legacy data) so the name is free for the computed
-- multi-valued property surfaced in the container JSON representation.
ALTER INDEX container_managed_by_idx RENAME TO container_managed_by_legacy_idx;
ALTER TABLE container RENAME COLUMN managed_by TO managed_by_legacy;

COMMIT;
