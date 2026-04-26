import {
	createPool,
	DatabasePool,
	DatabaseTransactionConnection,
	Interceptor,
	QueryResultRow,
	SchemaValidationError,
	SerializableValue,
	sql
} from 'slonik';
import * as z from 'zod';

const createResultParserInterceptor = (): Interceptor => {
	return {
		// If you are not going to transform results using Zod, then you should use `afterQueryExecution` instead.
		// Future versions of Zod will provide a more efficient parser when parsing without transformations.
		// You can even combine the two – use `afterQueryExecution` to validate results, and (conditionally)
		// transform results as needed in `transformRow`.
		transformRow: (executionContext, actualQuery, row) => {
			const { resultParser } = executionContext;

			if (!resultParser) {
				return row;
			}

			const validationResult = (resultParser as z.ZodAny).safeParse(row);

			if (!validationResult.success) {
				throw new SchemaValidationError(actualQuery, row, validationResult.error.issues);
			}

			return validationResult.data as QueryResultRow;
		},
		name: 'result-parser-interceptor'
	};
};

let pool: DatabasePool;

export async function getPool() {
	if (!pool) {
		pool = await createPool('postgres://', {
			interceptors: [createResultParserInterceptor()]
		});
	}
	return pool;
}

const empty = z.object({}).strict();

const jsonSchema = z.json();

export type Json = z.infer<typeof jsonSchema>;

export const administrativeAreaBBSR = z.object({
	area: z.preprocess((v) => parseFloat(String(v).replace(',', '.')), z.number().positive()),
	city_and_municipality_type: z.string(),
	name: z.string(),
	official_municipality_key: z.string().transform((v) => v.padStart(8, '0')),
	official_regional_code: z.string().transform((v) => v.padStart(12, '0')),
	population: z.coerce.number().int().nonnegative()
});

export type AdministrativeAreaBBSR = z.infer<typeof administrativeAreaBBSR>;

export const administrativeAreaOpenStreetMap = z.object({
	boundary: z.string().uuid(),
	name: z.string(),
	official_municipality_key: z
		.string()
		.transform((v) => v.padEnd(8, '0'))
		.optional()
		.nullable(),
	official_regional_code: z
		.string()
		.transform((v) => v.padEnd(12, '0'))
		.optional()
		.nullable(),
	relation_id: z.coerce.number(),
	wikidata_id: z.string().optional().nullable()
});

export type AdministrativeAreaOpenStreetMap = z.infer<typeof administrativeAreaOpenStreetMap>;

export const administrativeAreaWikidata = z.object({
	coat_of_arms: z.string().url().optional().nullable(),
	country: z.string(),
	id: z.string(),
	name: z.string(),
	official_municipality_key: z
		.string()
		.transform((v) => v.padEnd(8, '0'))
		.optional()
		.nullable(),
	official_regional_code: z
		.string()
		.transform((v) => v.padEnd(12, '0'))
		.optional()
		.nullable(),
	open_street_map_relation_id: z.coerce.number().optional().nullable()
});

export type AdministrativeAreaWikidata = z.infer<typeof administrativeAreaWikidata>;

export const administrativeAreaWegweiserKommune = z.object({
	demographic_type: z.number().int(),
	friendly_url: z.string(),
	id: z.number().int(),
	name: z.string(),
	official_municipality_key: z.string().transform((v) => v.padEnd(8, '0')),
	official_regional_code: z.string().transform((v) => v.padEnd(12, '0')),
	parent: z.string().nullable(),
	small_region_replacement: z.boolean().optional().nullable(),
	title: z.string(),
	type: z.string()
});

export type AdministrativeAreaWegweiserKommune = z.infer<typeof administrativeAreaWegweiserKommune>;

export const indicatorWegweiserKommune = z.object({
	calculation: z.string(),
	color_schema: z.string(),
	decimal_places: z.number().int().nonnegative(),
	explanation: z.string(),
	friendly_url: z.string(),
	hint: z.string().optional().nullable(),
	id: z.number().int(),
	maximum_classification: z.number().optional().nullable(),
	maximum_region_type: z.string(),
	minimum_classification: z.number().optional().nullable(),
	minimum_region_type: z.string(),
	name: z.string(),
	source: z.string(),
	top_low_regions_available: z.boolean(),
	topics: z.array(z.string()),
	title: z.string(),
	type: z.string(),
	unit: z.string(),
	years: z.array(z.number().int().nonnegative())
});

export type IndicatorWegweiserKommune = z.infer<typeof indicatorWegweiserKommune>;

export const indicatorDataWegweiserKommune = z.object({
	actual_values: z.array(z.tuple([z.number().int().positive(), z.number().nullable()])),
	indicator_id: z.number().positive(),
	official_regional_code: z.string().optional(),
	spatial_reference: z.string().uuid().optional().nullable()
});

export type IndicatorDataWegweiserKommune = z.infer<typeof indicatorDataWegweiserKommune>;

export const spatialFeature = z.object({
	geom: jsonSchema,
	guid: z.string().uuid()
});

import {
	mapPayload,
	administrativeAreaBasicDataPayload,
	demographicDataPayload,
	organizationalUnitPayload,
	indicatorTemplatePayload,
	actualDataPayload,
	categoryPayload,
	termPayload,
	customCollectionPayload,
	anyContainer,
	AnyContainer,
	categoryContainer as persistedCategoryContainer,
	CategoryContainer,
	termContainer as persistedTermContainer,
	TermContainer
} from '../../app/src/lib/models.ts';

export {
	mapPayload,
	administrativeAreaBasicDataPayload,
	categoryPayload,
	organizationalUnitPayload,
	indicatorTemplatePayload,
	actualDataPayload,
	termPayload
};

export type { AnyContainer as PersistedContainer, CategoryContainer, TermContainer };

export type OrganizationalUnitPayload = z.infer<typeof organizationalUnitPayload>;
export type ActualDataPayload = z.infer<typeof actualDataPayload>;
export type CategoryPayload = z.infer<typeof categoryPayload>;
export type TermPayload = z.infer<typeof termPayload>;

export const containerUser = z.array(
	z.object({
		object: z.number().int().positive().optional(),
		predicate: z.literal('is-creator-of'),
		subject: z.string().uuid()
	})
);

export const containerRelation = z.array(
	z.object({
		object: z.string().uuid(),
		position: z.number().int().nonnegative().default(0),
		predicate: z.enum(['is-part-of', 'is-part-of-category', 'is-section-of']),
		subject: z.string().uuid()
	})
);

type ContainerRelation = z.infer<typeof containerRelation>;

function createContainerSchema<P extends z.ZodTypeAny>(payloadSchema: P) {
	return z.object({
		managed_by: z.string(),
		organization: z.string(),
		organizational_unit: z.string().uuid().nullable(),
		payload: payloadSchema,
		realm: z.string(),
		user: containerUser.default([]),
		relation: containerRelation.default([])
	});
}

type NewContainerInput = z.infer<ReturnType<typeof createContainerSchema<z.ZodTypeAny>>>;

export const mapContainer = createContainerSchema(mapPayload);

export const administrativeAreaBasicDataContainer = createContainerSchema(
	administrativeAreaBasicDataPayload
);

export const demographicDataContainer = createContainerSchema(demographicDataPayload);

export const organizationalUnitContainer = createContainerSchema(organizationalUnitPayload);

export const indicatorTemplateContainer = createContainerSchema(indicatorTemplatePayload);

export const actualDataContainer = createContainerSchema(actualDataPayload);

export const categoryContainer = createContainerSchema(categoryPayload);

export const termContainer = createContainerSchema(termPayload);

export const customCollectionContainer = createContainerSchema(customCollectionPayload);

export function insertIntoAdministrativeAreaBBSR(data: Json) {
	return sql.type(administrativeAreaOpenStreetMap)`
		INSERT INTO administrative_area_bbsr (area, city_and_municipality_type, name, official_municipality_key, official_regional_code, population)
		SELECT *
		FROM jsonb_to_recordset(${sql.jsonb(data)}) AS t(area float, city_and_municipality_type text, name text, official_municipality_key text, official_regional_code text, population int)
	`;
}

export function getAdministrativeAreaBBSR(officialRegionalCode: string) {
	return sql.type(administrativeAreaBBSR)`
		SELECT * FROM administrative_area_bbsr WHERE official_regional_code = ${officialRegionalCode}
	`;
}

export function insertIntoAdministrativeAreaOpenStreetMap(data: Json) {
	return sql.type(administrativeAreaOpenStreetMap)`
		INSERT INTO administrative_area_open_street_map (boundary, name, official_municipality_key, official_regional_code, relation_id, wikidata_id)
		SELECT *
		FROM jsonb_to_recordset(${sql.jsonb(data)}) AS t(boundary uuid, name text, official_municipality_key text, official_regional_code text, relation_id int, wikidata_id text)
	`;
}

export function getAdministrativeAreaOpenStreetMap(officialRegionalCode: string) {
	return sql.type(administrativeAreaOpenStreetMap)`
		SELECT *
		FROM administrative_area_open_street_map WHERE official_regional_code = ${officialRegionalCode}
		ORDER BY valid_from DESC
		LIMIT 1
	`;
}

export function getAdministrativeAreaOpenStreetMapByRelationId(relationId: number) {
	return sql.type(administrativeAreaOpenStreetMap)`
		SELECT *
		FROM administrative_area_open_street_map WHERE relation_id = ${relationId}
		ORDER BY valid_from DESC
		LIMIT 1
	`;
}

export function insertIntoAdministrativeAreaWikidata(data: Json) {
	return sql.type(administrativeAreaWikidata)`
		INSERT INTO administrative_area_wikidata (area, coat_of_arms, country, id, name, official_municipality_key, official_regional_code, open_street_map_relation_id, population)
		SELECT *
		FROM jsonb_to_recordset(${sql.jsonb(data)}) AS t(area float, coat_of_arms text, country text, id text, name text, official_municipality_key text, official_regional_code text, open_street_map_relation_id int, population int)
		ON CONFLICT DO NOTHING 
	`;
}

export function getAdministrativeAreaWikidata(id: string) {
	return sql.type(administrativeAreaWikidata)`
		SELECT * FROM administrative_area_wikidata WHERE id = ${id}
		ORDER BY valid_from DESC
		LIMIT 1
	`;
}

export function getAdministrativeAreaWikidataByRegionalCode(officialRegionalCode: string) {
	return sql.type(administrativeAreaWikidata)`
		SELECT * FROM administrative_area_wikidata WHERE official_regional_code = ${officialRegionalCode}
		ORDER BY valid_from DESC
		LIMIT 1
	`;
}

export function insertIntoAdministrativeAreaWegweiserKommune(data: Json) {
	return sql.type(empty)`
		INSERT INTO administrative_area_wegweiser_kommune (demographic_type, friendly_url, id, name, official_municipality_key, official_regional_code, parent, small_region_replacement, title, type)
		SELECT *
		FROM jsonb_to_recordset(${sql.jsonb(data)}) AS t(demographic_type int, friendly_url text, id int, name text, official_municipality_key text, official_regional_code text, parent text, small_region_replacement bool, title text, type text)
	`;
}

export function insertIntoIndicatorWegweiserKommune(data: IndicatorWegweiserKommune[]) {
	return sql.type(empty)`
		INSERT INTO indicator_wegweiser_kommune (calculation, color_schema, decimal_places, explanation, friendly_url, hint, id, maximum_classification, maximum_region_type, minimum_classification, minimum_region_type, name, source, title, top_low_regions_available, topics, type, unit, years)
		SELECT *
		FROM jsonb_to_recordset(${sql.jsonb(data)}) AS t(calculation text, color_schema text, decimal_places int, explanation text, friendly_url text, hint text, id int, maximum_classification int, maximum_region_type text, minimum_classification int, minimum_region_type text, name text, source text, title text, top_low_regions_available bool, topics text[], type text, unit text, years int[])
	`;
}

export function getAllIndicatorWegweiserKommune() {
	return sql.type(indicatorWegweiserKommune)`
		SELECT DISTINCT ON (id) *
		FROM indicator_wegweiser_kommune
		ORDER BY id, valid_from DESC
	`;
}

export function insertIntoIndicatorDataWegweiserKommune(data: IndicatorDataWegweiserKommune[]) {
	return sql.type(empty)`
		WITH current_administrative_area AS (
			SELECT DISTINCT ON (relation_id) boundary, official_regional_code FROM administrative_area_open_street_map ORDER BY relation_id, valid_from DESC
		)
		INSERT INTO indicator_data_wegweiser_kommune (indicator_id, spatial_reference, actual_values)
		SELECT t.indicator_id, a.boundary, t.actual_values
		FROM jsonb_to_recordset(${sql.jsonb(data as SerializableValue)}) AS t(indicator_id int8, official_regional_code text, actual_values jsonb)
		JOIN current_administrative_area a ON a.official_regional_code = t.official_regional_code
	`;
}

export function insertIntoSpatialFeature(data: Json) {
	return sql.type(spatialFeature)`
		INSERT INTO spatial_feature (geom, guid)
		SELECT *
		FROM jsonb_to_recordset(${sql.jsonb(data)}) AS t(geom geometry, guid uuid)
	`;
}

export function createContainer(container: NewContainerInput) {
	return async (tx: DatabaseTransactionConnection) => {
		const result = await tx.one(sql.type(anyContainer)`
			INSERT INTO container (managed_by, organization, organizational_unit, payload, realm)
			VALUES (
				${container.managed_by},
				${container.organization},
				${container.organizational_unit},
				${sql.jsonb(<SerializableValue>container.payload)},
				${container.realm}
			)
			RETURNING *
		`);

		const user = container.user.map((u) => ({ ...u, object: result.revision }));

		await tx.query(sql.type(empty)`
			INSERT INTO container_user (object, predicate, subject)
			SELECT *
			FROM jsonb_to_recordset(${sql.jsonb(user)}) AS t(object int, predicate text, subject uuid)
		`);

		return result;
	};
}

export function updateContainer(container: AnyContainer) {
	return async (tx: DatabaseTransactionConnection) => {
		await tx.query(sql.type(anyContainer)`
			UPDATE container
			SET valid_currently = false
			WHERE guid = ${container.guid}
		`);

		const result = await tx.one(sql.type(anyContainer)`
			INSERT INTO container (guid, managed_by, organization, organizational_unit, payload, realm)
			VALUES (
				${container.guid},
				${container.managed_by},
				${container.organization},
				${container.organizational_unit},
				${sql.jsonb(<SerializableValue>container.payload)},
				${container.realm}
			)
			RETURNING *
		`);

		const user = container.user.map((u) => ({ ...u, object: result.revision }));

		await tx.query(sql.type(empty)`
			INSERT INTO container_user (object, predicate, subject)
			SELECT *
			FROM jsonb_to_recordset(${sql.jsonb(user)}) AS t(object int, predicate text, subject uuid)
		`);

		return result;
	};
}

export function getContainer(criteria: {
	organization: string;
	organizationalUnit: string | null;
	payload: {
		externalReference?: string;
		indicator?: string;
		officialRegionalCode?: string;
		organizationalUnitType?: string;
		title?: string;
		type?: string;
	};
}) {
	return async (tx: DatabaseTransactionConnection) => {
		const conditions = [
			sql.fragment`organization = ${criteria.organization}`,
			sql.fragment`valid_currently`,
			sql.fragment`NOT deleted`
		];

		if (criteria.organizationalUnit === null) {
			conditions.push(sql.fragment`organizational_unit IS NULL`);
		} else {
			conditions.push(sql.fragment`organizational_unit = ${criteria.organizationalUnit}`);
		}

		if (criteria.payload.indicator) {
			conditions.push(sql.fragment`payload->>'indicator' = ${criteria.payload.indicator}`);
		}

		if (criteria.payload.externalReference) {
			conditions.push(
				sql.fragment`payload->>'externalReference' = ${criteria.payload.externalReference}`
			);
		}

		if (criteria.payload.officialRegionalCode) {
			conditions.push(
				sql.fragment`payload->>'officialRegionalCode' = ${criteria.payload.officialRegionalCode}`
			);
		}

		if (criteria.payload.organizationalUnitType) {
			conditions.push(
				sql.fragment`payload->>'organizationalUnitType' = ${criteria.payload.organizationalUnitType}`
			);
		}

		if (criteria.payload.title) {
			conditions.push(sql.fragment`payload->>'title' = ${criteria.payload.title}`);
		}

		if (criteria.payload.type) {
			conditions.push(sql.fragment`payload->>'type' = ${criteria.payload.type}`);
		}

		return await tx.maybeOne(sql.type(anyContainer)`
			SELECT *
			FROM container
			WHERE ${sql.join(conditions, sql.fragment` AND `)}
			LIMIT 1
		`);
	};
}

export function createRelation(relation: ContainerRelation) {
	return async (tx: DatabaseTransactionConnection) => {
		await tx.query(sql.type(empty)`
			INSERT INTO container_relation (object, position, predicate, subject)
			SELECT *
			FROM jsonb_to_recordset(${sql.jsonb(relation)}) AS t(object uuid, position int, predicate text, subject uuid)
			ON CONFLICT (object, predicate, subject) WHERE valid_currently DO UPDATE SET position = EXCLUDED.position
		`);
	};
}

export async function getCategoryContainer(
	tx: DatabaseTransactionConnection,
	organizationGuid: string,
	key: string
): Promise<CategoryContainer | null> {
	return tx.maybeOne(sql.type(persistedCategoryContainer)`
		SELECT *
		FROM container
		WHERE organization = ${organizationGuid}
			AND valid_currently
			AND NOT deleted
			AND payload->>'type' = 'category'
			AND payload->>'key' = ${key}
		ORDER BY valid_from DESC
	`);
}

export async function getTermContainersForCategory(
	tx: DatabaseTransactionConnection,
	organizationGuid: string,
	categoryGuid: string,
	predicate = 'is-part-of-category'
): Promise<Readonly<Array<TermContainer>>> {
	return await tx.any(sql.type(persistedTermContainer)`
		SELECT c.*
		FROM container c
		JOIN container_relation cr
			ON cr.subject = c.guid
			AND cr.object = ${categoryGuid}
			AND cr.predicate = ${predicate}
			AND cr.valid_currently
			AND NOT cr.deleted
		WHERE c.organization = ${organizationGuid}
			AND c.valid_currently
			AND NOT c.deleted
			AND c.payload->>'type' = 'term'
		ORDER BY c.payload->>'value', c.guid
	`);
}

const isObject = (item: unknown): item is Record<string, unknown> => {
	return item !== null && typeof item === 'object' && !Array.isArray(item);
};

export const mergeDeep = (
	target: Record<string, unknown>,
	...sources: Record<string, unknown>[]
): Record<string, unknown> => {
	if (!sources.length) return { ...target };
	const [source, ...rest] = sources;

	const result: Record<string, unknown> = { ...target };
	for (const key in source) {
		if (Array.isArray(source[key]) && Array.isArray(target[key])) {
			result[key] = [...new Set([...target[key], ...source[key]])];
		} else if (isObject(source[key])) {
			result[key] = mergeDeep(isObject(target[key]) ? target[key] : {}, source[key]);
		} else {
			result[key] = source[key];
		}
	}
	return mergeDeep(result, ...rest);
};
