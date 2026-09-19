UPDATE container
SET payload = payload - 'inheritsGrants'
WHERE payload->>'type' IN ('measure', 'organizational_unit', 'program', 'simple_measure');
