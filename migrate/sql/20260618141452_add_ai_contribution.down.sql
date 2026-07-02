BEGIN;

UPDATE container SET payload = payload - 'aiContribution' WHERE payload ? 'aiContribution';

COMMIT;
