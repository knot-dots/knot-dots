BEGIN;

UPDATE container
SET payload = jsonb_set(
    payload,
    '{category}',
    COALESCE(payload->'category', '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
        'sdg', payload->'sdg',
        'topic', payload->'topic',
        'policyFieldBNK', payload->'policyFieldBNK',
        'audience', payload->'audience'
    )),
    true
)
WHERE organization IN ('05b69915-1dba-4094-860d-ed290f119a41', '0b4528ed-433d-4e29-aabc-6dedd44992c6', '0bddac59-17e7-48d7-9b66-f53ff5ce5521', '3aedc661-1c69-46ac-8a39-f143615eb956', '59a5bdb6-82da-48d6-8a32-4d854b4a8fcc', '743487a1-e49e-4526-bebd-2b3fe9e838e5', 'dede21cf-926e-4b9a-990f-b38dd0f7304b', 'e6553ad1-93ab-4d14-9ba2-d7a86826c71e', 'dd56df72-074a-43c1-8092-88c1c6a6e2ad')
    AND payload ? 'category'
    AND (payload ? 'sdg'
    OR payload ? 'topic'
    OR payload ? 'policyFieldBNK'
    OR payload ? 'audience');

UPDATE container
SET payload = jsonb_set(payload, '{category,sdg}', payload->'sdg', true )
WHERE payload ? 'category' AND payload ? 'sdg' AND payload->'sdg' != payload->'category'->'sdg' AND (NOT payload->'category' ? 'sdg' OR payload->'category'->'sdg' = '[]'::jsonb);

UPDATE container
SET payload = jsonb_set(payload, '{category,topic}', payload->'topic', true)
WHERE payload ? 'category' AND payload ? 'topic' AND payload->'topic' != payload->'category'->'topic' AND (NOT payload->'category' ? 'topic' OR payload->'category'->'topic' = '[]'::jsonb);

UPDATE container
SET payload = jsonb_set(payload, '{category,policyFieldBNK}', payload->'policyFieldBNK', true)
WHERE payload ? 'category' AND payload ? 'policyFieldBNK' AND payload->'policyFieldBNK' != payload->'category'->'policyFieldBNK' AND (NOT payload->'category' ? 'policyFieldBNK' OR payload->'category'->'policyFieldBNK' = '[]'::jsonb);

UPDATE container
SET payload = jsonb_set(payload, '{category,audience}', payload->'audience', true)
WHERE payload ? 'category' AND payload ? 'audience' AND payload->'audience' != payload->'category'->'audience' AND (NOT payload->'category' ? 'audience' OR payload->'category'->'audience' = '[]'::jsonb);

COMMIT;
