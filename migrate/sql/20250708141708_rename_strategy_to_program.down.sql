UPDATE container SET payload = jsonb_set(payload, '{type}', '"strategy"') WHERE payload->>'type' = 'program';
UPDATE container SET payload = jsonb_set(payload, '{strategyType}', payload->'programType', true) WHERE payload->>'type' = 'strategy';
UPDATE container SET payload = payload - 'programType' WHERE payload->>'type' = 'program';
UPDATE container SET payload = jsonb_set(payload, '{strategyType}', '"strategy_type.misc"') WHERE payload->>'programType' = 'program_type.misc';
UPDATE container SET payload = jsonb_set(payload, '{strategyType}', '"strategy_type.mobility"') WHERE payload->>'programType' = 'program_type.mobility';
UPDATE container SET payload = jsonb_set(payload, '{strategyType}', '"strategy_type.sustainability"') WHERE payload->>'programType' = 'program_type.sustainability';
UPDATE container SET payload = jsonb_set(payload, '{strategyType}', '"strategy_type.smart_city"') WHERE payload->>'programType' = 'program_type.smart_city';
UPDATE container SET payload = jsonb_set(payload, '{strategyType}', '"strategy_type.isek"') WHERE payload->>'programType' = 'program_type.isek';
UPDATE container SET payload = jsonb_set(payload, '{strategyType}', '"strategy_type.report"') WHERE payload->>'programType' = 'program_type.report';
UPDATE container SET payload = jsonb_set(payload, '{strategyType}', '"strategy_type.set_of_rules"') WHERE payload->>'programType' = 'program_type.set_of_rules';
UPDATE container SET payload = jsonb_set(payload, '{strategyType}', '"strategy_type.package_of_measures"') WHERE payload->>'programType' = 'program_type.package_of_measures';
UPDATE container SET payload = jsonb_set(payload, '{strategyType}', '"strategy_type.funding_program"') WHERE payload->>'programType' = 'program_type.funding_program';
UPDATE container SET payload = jsonb_set(payload, '{strategyType}', '"strategy_type.guide"') WHERE payload->>'programType' = 'program_type.guide';
UPDATE container_relation SET predicate = 'is-part-of-strategy' WHERE predicate = 'is-part-of-program';
