ALTER TABLE container_relation RENAME object TO object_revision;
ALTER TABLE container_relation RENAME subject TO subject_revision;
ALTER TABLE container_relation ADD COLUMN object uuid;
ALTER TABLE container_relation ADD COLUMN subject uuid;
ALTER TABLE container_relation ADD COLUMN valid_currently bool DEFAULT true;
ALTER TABLE container_relation ADD COLUMN valid_from timestamp with time zone;
ALTER TABLE container_relation ADD COLUMN creator uuid;
ALTER TABLE container_relation ADD COLUMN deleted bool DEFAULT false;

ALTER INDEX container_relation_object_idx RENAME TO container_relation_object_revision_idx;
ALTER INDEX container_relation_subject_idx RENAME TO container_relation_subject_revision_idx;
ALTER INDEX container_relation_predicate_object_subject_key RENAME TO container_relation_object_rev_predicate_subject_rev_key;

CREATE INDEX container_relation_object_idx ON container_relation (object);
CREATE INDEX container_relation_subject_idx ON container_relation (subject);
CREATE INDEX container_relation_valid_currently ON container_relation (valid_currently) WHERE valid_currently;
CREATE INDEX container_relation_valid_from_idx ON container_relation (valid_from);
CREATE UNIQUE INDEX container_relation_object_predicate_subject_key ON container_relation (object, predicate, subject) WHERE valid_currently;

INSERT INTO container_relation (creator, object, object_revision, predicate, subject, subject_revision, valid_currently, valid_from)
SELECT cu.subject AS creator, o.guid AS object, o.revision, cr.predicate, s.guid AS subject, s.revision, false, s.valid_from
FROM container_relation cr
         JOIN container s ON cr.subject_revision = s.revision
         JOIN container_user cu ON s.revision = cu.object AND cu.predicate = 'is-creator-of'
         JOIN container o ON cr.object_revision = o.revision
ORDER BY cr.subject, cr.object
ON CONFLICT ON CONSTRAINT container_relation_object_rev_predicate_subject_rev_key DO UPDATE
    SET creator = excluded.creator, object = excluded.object, subject = excluded.subject, valid_currently = false, valid_from = excluded.valid_from;

WITH r AS (
    SELECT max(valid_from) AS valid_from, subject, max(subject_revision) AS subject_revision, object, max(object_revision) AS object_revision, predicate
    FROM container_relation cr
    GROUP BY subject, object, predicate
)
INSERT INTO container_relation (creator, deleted, object, object_revision, predicate, subject, subject_revision, valid_currently, valid_from)
SELECT cu.subject AS creator, final.* FROM (
    SELECT CASE WHEN max(revision) > subject_revision THEN true ELSE false END AS deleted, object, object_revision, current.predicate, guid, max(revision) AS subject_revision, true AS valid_currently, max(valid_from) AS valid_from
    FROM (
        SELECT c.guid, c.revision AS revision, r.subject_revision, r.object, r.object_revision, r.predicate, c.valid_from
        FROM container c
        JOIN r ON c.guid = r.subject
        WHERE c.revision = r.subject_revision
        UNION
        SELECT c.guid, min(c.revision) AS revision,r.subject_revision,r.object, r.object_revision,r.predicate, min(c.valid_from)
        FROM container c
        JOIN r ON c.guid = r.subject
        WHERE c.revision > r.subject_revision
        GROUP BY c.guid, r.subject_revision, r.object, r.object_revision, r.predicate
    ) AS current
    GROUP BY guid, subject_revision, object, object_revision, current.predicate
) AS final
JOIN container_user cu ON cu.object = final.subject_revision AND cu.predicate = 'is-creator-of'
ON CONFLICT ON CONSTRAINT container_relation_object_rev_predicate_subject_rev_key DO UPDATE SET valid_currently = true;

ALTER TABLE container_relation DROP CONSTRAINT container_relation_object_rev_predicate_subject_rev_key;
ALTER TABLE container_relation DROP COLUMN object_revision;
ALTER TABLE container_relation DROP COLUMN subject_revision;
