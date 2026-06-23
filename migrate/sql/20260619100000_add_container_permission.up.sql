-- container_permission stores direct (non-inherited) permission grants.
-- Permissions are inherited at query-time via a recursive CTE that walks
-- the container_relation hierarchy (is-part-of / is-part-of-program /
-- is-part-of-category / is-measured-by).
--
-- object    – container.guid of the directly granted container
-- subject   – user guid, team container guid, or the public pseudo-subject
--             (00000000-0000-0000-0000-000000000000)
-- predicate – role (is-admin-of, is-head-of, is-collaborator-of,
--             is-member-of, is-creator-of)
CREATE TABLE container_permission
(
    object    uuid        NOT NULL,
    subject   uuid        NOT NULL,
    predicate varchar(64) NOT NULL,
    PRIMARY KEY (object, subject, predicate)
);

CREATE INDEX container_permission_object_idx   ON container_permission (object);
CREATE INDEX container_permission_subject_idx  ON container_permission (subject);
