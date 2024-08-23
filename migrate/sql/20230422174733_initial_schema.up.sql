CREATE TABLE container
(
    guid            uuid                     DEFAULT gen_random_uuid(),
    payload         jsonb,
    realm           varchar(1024),
    revision        serial PRIMARY KEY,
    type            varchar(32),
    valid_currently bool                     DEFAULT true,
    valid_from      timestamp with time zone DEFAULT now()
);

CREATE INDEX container_type_idx ON container (type);
CREATE INDEX container_realm_idx ON container (realm);
CREATE INDEX container_valid_currently_idx ON container (valid_currently);
CREATE INDEX container_valid_from_idx ON container (valid_from);

CREATE TABLE container_user
(
    issuer   varchar(1024),
    revision bigint REFERENCES container (revision),
    subject  uuid
);

CREATE INDEX container_user_issuer_idx ON container_user (issuer);
CREATE INDEX container_user_subject_idx ON container_user (subject);
