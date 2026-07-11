BEGIN;

UPDATE container SET payload = payload - 'audience' WHERE payload ? 'audience';
UPDATE container SET payload = payload - 'policyFieldBNK' WHERE payload ? 'policyFieldBNK';
UPDATE container SET payload = payload - 'sdg' WHERE payload ? 'sdg';
UPDATE container SET payload = payload - 'topic' WHERE payload ? 'topic';

COMMIT;
