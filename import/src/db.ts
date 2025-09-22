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

			const validationResult = resultParser.safeParse(row);

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

const literalSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

type Literal = z.infer<typeof literalSchema>;

export type Json = Literal | { [key: string]: Json } | Json[];

const jsonSchema: z.ZodType<Json> = z.lazy(() =>
	z.union([literalSchema, z.array(jsonSchema), z.record(jsonSchema)])
);

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
	official_municipality_key: z.string(),
	official_regional_code: z.string(),
	parent: z.string().nullable(),
	small_region_replacement: z.boolean().optional().nullable(),
	title: z.string(),
	type: z.string()
});

export type AdministrativeAreaWegweiserKommune = z.infer<typeof administrativeAreaWegweiserKommune>;

export const spatialFeature = z.object({
	geom: jsonSchema,
	guid: z.string().uuid()
});

export const mapPayload = z.object({
	geometry: z.string().uuid(),
	title: z.string().default('Gebietsgrenze'),
	type: z.literal('map').default('map'),
	visibility: z.literal('organization').default('organization')
});

export const administrativeAreaBasicDataPayload = z.object({
	title: z.string().readonly().default('Basisinformationen'),
	type: z.literal('administrative_area_basic_data').default('administrative_area_basic_data'),
	visibility: z.literal('organization').default('organization')
});

export const organizationalUnitPayload = z.object({
	administrativeType: z
		.enum([
			'administrative_type.municipality',
			'administrative_type.rural_district',
			'administrative_type.urban_district'
		])
		.optional(),
	boards: z.array(z.string()).default(['board.indicators']),
	cityAndMunicipalityTypeBBSR: z.string().optional(),
	description: z.string().trim().optional(),
	federalState: z.string().optional(),
	image: z.string().url().optional(),
	level: z.coerce.number().int().positive().default(1),
	name: z.string().trim(),
	officialMunicipalityKey: z.string().optional(),
	officialRegionalCode: z.string().optional(),
	organizationalUnitType: z
		.literal('organizational_unit_type.administrative_area')
		.default('organizational_unit_type.administrative_area'),
	type: z.literal('organizational_unit').default('organizational_unit'),
	visibility: z.literal('organization').default('organization')
});

const anyPayload = z.discriminatedUnion('type', [
	mapPayload,
	administrativeAreaBasicDataPayload,
	organizationalUnitPayload
]);

export type Payload = z.infer<typeof anyPayload>;

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
		predicate: z.enum(['is-part-of', 'is-section-of']),
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

export type Container<P extends Payload = Payload> = z.infer<
	ReturnType<typeof createContainerSchema<z.ZodType<P>>>
>;

export const mapContainer = createContainerSchema(mapPayload);

export const administrativeAreaBasicDataContainer = createContainerSchema(
	administrativeAreaBasicDataPayload
);

export const organizationalUnitContainer = createContainerSchema(organizationalUnitPayload);

const persistedContainer = createContainerSchema(anyPayload).extend({
	guid: z.string().uuid(),
	revision: z.number().int().positive()
});

export type PersistedContainer = z.infer<typeof persistedContainer>;

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

export function insertIntoAdministrativeAreaWegweiserKommune(data: Json) {
	return sql.type(empty)`
		INSERT INTO administrative_area_wegweiser_kommune (demographic_type, friendly_url, id, name, official_municipality_key, official_regional_code, parent, small_region_replacement, title, type)
		SELECT *
		FROM jsonb_to_recordset(${sql.jsonb(data)}) AS t(demographic_type int, friendly_url text, id int, name text, official_municipality_key text, official_regional_code text, parent text, small_region_replacement bool, title text, type text)
	`;
}

export function insertIntoSpatialFeature(data: Json) {
	return sql.type(spatialFeature)`
		INSERT INTO spatial_feature (geom, guid)
		SELECT *
		FROM jsonb_to_recordset(${sql.jsonb(data)}) AS t(geom geometry, guid uuid)
	`;
}

export function createContainer(container: Container) {
	return async (tx: DatabaseTransactionConnection) => {
		const result = await tx.one(sql.type(persistedContainer)`
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

export function updateContainer(container: PersistedContainer) {
	return async (tx: DatabaseTransactionConnection) => {
		await tx.query(sql.type(persistedContainer)`
			UPDATE container
			SET valid_currently = false
			WHERE guid = ${container.guid}
		`);

		const result = await tx.one(sql.type(persistedContainer)`
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

export function getContainer(
	organization: string,
	organizationalUnit: string | null,
	officialRegionalCode: string
) {
	return async (tx: DatabaseTransactionConnection) => {
		const conditions = [
			sql.fragment`organization = ${organization}`,
			sql.fragment`organizational_unit = ${organizationalUnit}`,
			sql.fragment`payload->>'officialRegionalCode' = ${officialRegionalCode}`,
			sql.fragment`valid_currently`,
			sql.fragment`NOT deleted`
		];

		return await tx.maybeOne(sql.type(persistedContainer)`
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
		`);
	};
}
