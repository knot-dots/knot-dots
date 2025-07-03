import { SchemaValidationError, createPool, createSqlTag } from 'slonik';
import type {
	DatabaseConnection,
	DatabasePool,
	Interceptor,
	QueryResultRow,
	SerializableValue
} from 'slonik';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import {
	anyContainer,
	container,
	findDescendants,
	organizationalUnitContainer,
	organizationContainer,
	payloadTypes,
	predicates,
	relation,
	user,
	userRelation,
	visibility
} from '$lib/models';
import type {
	AnyContainer,
	Container,
	IndicatorContainer,
	ModifiedContainer,
	NewContainer,
	OrganizationContainer,
	OrganizationalUnitContainer,
	PayloadType,
	Predicate,
	Relation,
	TaskPriority,
	User
} from '$lib/models';
import { createGroup, updateAccessSettings } from '$lib/server/keycloak';

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
		}
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

const typeAliases = {
	anyContainer: anyContainer.omit({ relation: true, user: true }),
	container: container.omit({ relation: true, user: true }),
	guid: z.object({ guid: z.string().uuid() }),
	organizationContainer: organizationContainer.omit({ relation: true, user: true }),
	organizationalUnitContainer: organizationalUnitContainer.omit({ relation: true, user: true }),
	relation,
	relationPath: z.object({}).catchall(z.string().uuid()),
	revision: z.object({ revision: z.number().int().positive() }),
	user,
	userRelation,
	userRelationWithObject: userRelation.extend({
		object: z.number().int().positive()
	}),
	void: z.object({}).strict()
};

const sql = createSqlTag({ typeAliases });

export function createContainer(container: NewContainer) {
	return (connection: DatabaseConnection): Promise<AnyContainer> => {
		return connection.transaction(async (txConnection) => {
			let organizationGuid;
			let organizationalUnitGuid;

			if (container.payload.type === payloadTypes.enum.organization) {
				organizationGuid = await createGroup(container.payload.name);
				await updateAccessSettings(organizationGuid);
			} else if (container.payload.type === payloadTypes.enum.organizational_unit) {
				organizationalUnitGuid = uuid();
				await updateAccessSettings(organizationalUnitGuid);
			}

			const containerResult = organizationGuid
				? await txConnection.one(sql.typeAlias('anyContainer')`
					INSERT INTO container (guid, managed_by, organization, payload, realm)
					VALUES (
						${organizationGuid},
            ${container.managed_by},
						${organizationGuid},
						${sql.jsonb(<SerializableValue>container.payload)},
						${container.realm}
					)
					RETURNING *
				`)
				: organizationalUnitGuid
					? await txConnection.one(sql.typeAlias('anyContainer')`
						INSERT INTO container (guid, managed_by, organization, payload, realm)
						VALUES (
							${organizationalUnitGuid},
              ${container.managed_by},
							${container.organization},
							${sql.jsonb(<SerializableValue>container.payload)},
							${container.realm}
						)
						RETURNING *
					`)
					: await txConnection.one(sql.typeAlias('anyContainer')`
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

			const userValues = container.user.map((u) => [
				containerResult.revision,
				u.predicate,
				u.subject
			]);
			const userResult = await txConnection.any(sql.typeAlias('userRelation')`
				INSERT INTO container_user (object, predicate, subject)
				SELECT *
				FROM ${sql.unnest(userValues, ['int8', 'text', 'uuid'])}
				RETURNING predicate, subject
      `);

			const relations = container.relation.map((r) => ({
				...r,
				object: r.object ?? containerResult.guid,
				subject: r.subject ?? containerResult.guid
			}));
			const relationResult = await createManyContainerRelations(relations)(txConnection);

			const isPartOfStrategyRelation = relationResult.find(
				({ predicate }) => predicate == predicates.enum['is-part-of-strategy']
			);
			if (isPartOfStrategyRelation) {
				await txConnection.any(sql.typeAlias(`void`)`
					UPDATE container_relation SET position = position + 1
					WHERE predicate = ${predicates.enum['is-part-of-strategy']}
						AND object = ${isPartOfStrategyRelation.object}
						AND subject != ${containerResult.guid}
						AND position >= ${isPartOfStrategyRelation.position}
				`);
			}

			return { ...containerResult, relation: [...relationResult], user: [...userResult] };
		});
	};
}

export function updateContainer(container: ModifiedContainer) {
	return (connection: DatabaseConnection) => {
		return connection.transaction(async (txConnection) => {
			const previousRevision = await getContainerByGuid(container.guid)(txConnection);

			await txConnection.query(sql.typeAlias('void')`
				UPDATE container
				SET valid_currently = false
				WHERE guid = ${container.guid}
			`);

			const containerResult = await txConnection.one(sql.typeAlias('anyContainer')`
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

			const userValues = container.user.map((u) => [
				containerResult.revision,
				u.predicate,
				u.subject
			]);
			const userResult = await txConnection.any(sql.typeAlias('userRelation')`
				INSERT INTO container_user (object, predicate, subject)
				SELECT *
				FROM ${sql.unnest(userValues, ['int8', 'text', 'uuid'])}
				RETURNING predicate, subject
      `);

			const relationResult = await getAllDirectContainerRelations(container.guid)(txConnection);
			const deletedRelations = relationResult.filter(
				(r) =>
					container.relation.findIndex(
						({ object, predicate, subject }) =>
							object === r.object && predicate === r.predicate && subject === r.subject
					) == -1
			);
			await deleteManyContainerRelations(deletedRelations)(txConnection);
			await updateManyContainerRelations(container.relation)(txConnection);

			if (container.payload.type == payloadTypes.enum.strategy) {
				if (
					container.organizational_unit &&
					previousRevision.organizational_unit != container.organizational_unit
				) {
					await bulkUpdateOrganizationalUnit(
						previousRevision,
						container.organizational_unit
					)(txConnection);
				}
				if (previousRevision.organization != container.organization) {
					await bulkUpdateOrganization(previousRevision, container.organization)(txConnection);
				}
				if (previousRevision.managed_by != container.managed_by) {
					await bulkUpdateManagedBy(previousRevision, container.managed_by)(txConnection);
				}
			} else if (
				container.payload.type == payloadTypes.enum.measure ||
				container.payload.type == payloadTypes.enum.simple_measure
			) {
				if (previousRevision.managed_by != container.managed_by) {
					await bulkUpdateManagedBy(previousRevision, container.managed_by)(txConnection);
				}
			}

			return { ...containerResult, user: userResult };
		});
	};
}

export function deleteContainer(container: AnyContainer) {
	return (connection: DatabaseConnection) => {
		return connection.transaction(async (txConnection) => {
			await txConnection.query(sql.typeAlias('void')`
				UPDATE container
				SET valid_currently = false
				WHERE guid = ${container.guid}
			`);

			const deletedRevision = await txConnection.oneFirst(sql.typeAlias('revision')`
				INSERT INTO container (deleted, guid, managed_by, organization, organizational_unit, payload, realm)
				SELECT true, guid, managed_by, organization, organizational_unit, payload, realm FROM container
				WHERE revision = ${container.revision}
				RETURNING revision
			`);

			const relationResult = await getAllDirectContainerRelations(container.guid)(txConnection);
			await deleteManyContainerRelations(relationResult)(txConnection);

			const userValues = container.user.map((u) => [deletedRevision, u.predicate, u.subject]);
			await txConnection.query(sql.typeAlias('void')`
				INSERT INTO container_user (object, predicate, subject)
				SELECT *
				FROM ${sql.unnest(userValues, ['int8', 'text', 'uuid'])}
      `);
		});
	};
}

export function deleteContainerRecursively(container: AnyContainer) {
	return async (connection: DatabaseConnection) => {
		return connection.transaction(async (txConnection) => {
			const parts = await getAllRelatedContainers(
				[container.organization],
				container.guid,
				[predicates.enum['is-part-of']],
				{},
				''
			)(txConnection);

			await deleteContainer(container)(txConnection);

			for (const part of findDescendants(container, parts, predicates.enum['is-part-of'])) {
				await deleteContainer({ ...part, user: container.user })(txConnection);
			}
		});
	};
}

export function getContainerByGuid(guid: string) {
	return async (connection: DatabaseConnection): Promise<AnyContainer> => {
		const containerResult = await connection.one(sql.typeAlias('anyContainer')`
			SELECT *
			FROM container
			WHERE guid = ${guid}
				AND valid_currently
				AND NOT deleted
		`);
		const userResult = await connection.any(sql.typeAlias('userRelationWithObject')`
			SELECT *
			FROM container_user
			WHERE object = ${containerResult.revision}
		`);
		const relationResult = await connection.any(sql.typeAlias('relation')`
			SELECT cr.*
			FROM container_relation cr
			WHERE (cr.subject = ${containerResult.guid} OR cr.object = ${containerResult.guid})
				AND cr.valid_currently
				AND NOT cr.deleted
			ORDER BY cr.position
		`);
		return {
			...containerResult,
			relation: relationResult.map((r) => r),
			user: userResult.map(({ predicate, subject }) => ({ predicate, subject }))
		};
	};
}

export function getContainerBySlug(slug: string) {
	return async (connection: DatabaseConnection): Promise<Container> => {
		const containerResult = await connection.one(sql.typeAlias('container')`
			SELECT *
			FROM container
			WHERE payload->>'slug' = ${slug} AND valid_currently AND NOT deleted
		`);

		const userResult = await connection.any(sql.typeAlias('userRelationWithObject')`
			SELECT *
			FROM container_user
			WHERE object = ${containerResult.revision}
		`);
		const relationResult = await connection.any(sql.typeAlias('relation')`
			SELECT cr.*
			FROM container_relation cr
			WHERE (cr.subject = ${containerResult.guid} OR cr.object = ${containerResult.guid})
				AND cr.valid_currently
				AND NOT cr.deleted
			ORDER BY cr.position
		`);
		return {
			...containerResult,
			relation: relationResult.map((r) => r),
			user: userResult.map(({ predicate, subject }) => ({ predicate, subject }))
		};
	};
}

export function getAllContainerRevisionsByGuid(guid: string) {
	return async (connection: DatabaseConnection): Promise<AnyContainer[]> => {
		const containerResult = await connection.many(sql.typeAlias('anyContainer')`
			SELECT *
			FROM container
			WHERE guid = ${guid}
				AND NOT deleted
			ORDER BY valid_from;
		`);

		const revisions = sql.join(
			containerResult.map((c) => c.revision),
			sql.fragment`, `
		);

		const userResult = await connection.any(sql.typeAlias('userRelationWithObject')`
			SELECT *
			FROM container_user
			WHERE object IN (${revisions})
		`);

		const relationResult = await connection.any(sql.typeAlias('relation')`
			SELECT cr.*
			FROM container_relation cr
			WHERE (cr.subject IN (${guid}) OR cr.object IN (${guid}))
				AND cr.valid_currently
				AND NOT cr.deleted
			ORDER BY cr.position
		`);

		return containerResult.map((c) => ({
			...c,
			relation: relationResult.filter(
				({ object, subject }) => object === c.guid || subject === c.guid
			),
			user: userResult
				.filter((u) => u.object === c.revision)
				.map(({ predicate, subject }) => ({ predicate, subject }))
		}));
	};
}

function prepareWhereCondition(filters: {
	assignees?: string[];
	audience?: string[];
	categories?: string[];
	indicatorCategories?: string[];
	indicatorTypes?: string[];
	measureTypes?: string[];
	organizations?: string[];
	organizationalUnits?: string[];
	policyFieldsBNK?: string[];
	strategyTypes?: string[];
	taskCategories?: string[];
	template?: boolean;
	terms?: string;
	topics?: string[];
	type?: PayloadType[];
}) {
	const conditions = [
		sql.fragment`c.valid_currently`,
		sql.fragment`NOT c.deleted`,
		sql.fragment`c.payload->>'type' NOT IN ('organization', 'organizational_unit')`
	];
	if (filters.assignees?.length) {
		conditions.push(sql.fragment`c.payload->'assignee' ?| ${sql.array(filters.assignees, 'text')}`);
	}
	if (filters.audience?.length) {
		conditions.push(sql.fragment`c.payload->'audience' ?| ${sql.array(filters.audience, 'text')}`);
	}
	if (filters.categories?.length) {
		conditions.push(
			sql.fragment`c.payload->'category' ?| ${sql.array(filters.categories, 'text')}`
		);
	}
	if (filters.indicatorCategories?.length) {
		conditions.push(
			sql.fragment`c.payload->'indicatorCategory' ?| ${sql.array(
				filters.indicatorCategories,
				'text'
			)}`
		);
	}
	if (filters.indicatorTypes?.length) {
		conditions.push(
			sql.fragment`c.payload->'indicatorType' ?| ${sql.array(filters.indicatorTypes, 'text')}`
		);
	}
	if (filters.measureTypes?.length) {
		conditions.push(
			sql.fragment`c.payload->'measureType' ?| ${sql.array(filters.measureTypes, 'text')}`
		);
	}
	if (filters.organizations?.length) {
		conditions.push(
			sql.fragment`c.organization IN (${sql.join(filters.organizations, sql.fragment`, `)})`
		);
	}
	if (filters.organizationalUnits?.length) {
		conditions.push(
			sql.fragment`c.organizational_unit IN (${sql.join(
				filters.organizationalUnits,
				sql.fragment`, `
			)})`
		);
	}
	if (filters.policyFieldsBNK?.length) {
		conditions.push(
			sql.fragment`c.payload->'policyFieldBNK' ?| ${sql.array(filters.policyFieldsBNK, 'text')}`
		);
	}
	if (filters.strategyTypes?.length) {
		conditions.push(
			sql.fragment`c.payload->>'strategyType' IN (${sql.join(
				filters.strategyTypes,
				sql.fragment`, `
			)})`
		);
	}
	if (filters.taskCategories?.length) {
		conditions.push(
			sql.fragment`c.payload->>'taskCategory' IN (${sql.join(
				filters.taskCategories,
				sql.fragment`, `
			)})`
		);
	}
	if (filters.template) {
		conditions.push(sql.fragment`c.payload @> '{"template": true}'`);
	} else {
		conditions.push(sql.fragment`(c.payload @> '{"template": false}' OR NOT payload ? 'template')`);
	}
	if (filters.terms) {
		conditions.push(
			sql.fragment`to_tsquery('german', ${filters.terms
				.trim()
				.split(' ')
				.map((t) => `${t}:*`)
				.join(' & ')}) @@ jsonb_to_tsvector('german', c.payload, '["string", "numeric"]')`
		);
	}
	if (filters.topics?.length) {
		conditions.push(sql.fragment`c.payload->'topic' ?| ${sql.array(filters.topics, 'text')}`);
	}
	if (filters.type?.length) {
		conditions.push(
			sql.fragment`c.payload->>'type' IN (${sql.join(filters.type, sql.fragment`, `)})`
		);
	}
	return sql.join(conditions, sql.fragment` AND `);
}

function prepareOrderByExpression(sort: string) {
	let order_by = sql.fragment`c.payload->>'title' COLLATE human_sort`;
	if (sort == 'modified') {
		order_by = sql.fragment`c.valid_from DESC`;
	} else if (sort == 'priority') {
		order_by = sql.fragment`priority`;
	}
	return order_by;
}

async function withUserAndRelation<T extends AnyContainer>(
	connection: DatabaseConnection,
	containerResult: Readonly<Array<Omit<T, 'user' | 'relation'>>>
) {
	const revisions = sql.join(
		containerResult.map(({ revision }) => revision),
		sql.fragment`, `
	);

	const userResult =
		containerResult.length > 0
			? await connection.any(sql.typeAlias('userRelationWithObject')`
				SELECT *
				FROM container_user
				WHERE object IN (${revisions})
			`)
			: [];

	const guids = sql.join(
		containerResult.map(({ guid }) => guid),
		sql.fragment`, `
	);

	const relationResult =
		containerResult.length > 0
			? await connection.any(sql.typeAlias('relation')`
				SELECT cr.*
				FROM container_relation cr
				WHERE (cr.object IN (${guids}) OR cr.subject IN (${guids}))
					AND cr.valid_currently
					AND NOT cr.deleted
				ORDER BY cr.position
			`)
			: [];

	return containerResult.map((c) => ({
		...c,
		relation: relationResult.filter(
			({ object, subject }) => object === c.guid || subject === c.guid
		),
		user: userResult
			.filter((u) => u.object === c.revision)
			.map(({ predicate, subject }) => ({ predicate, subject }))
	}));
}

export function getManyContainers(
	organizations: string[],
	filters: {
		assignees?: string[];
		audience?: string[];
		categories?: string[];
		indicatorCategories?: string[];
		measureTypes?: string[];
		indicatorTypes?: string[];
		organizationalUnits?: string[];
		policyFieldsBNK?: string[];
		strategyTypes?: string[];
		taskCategories?: string[];
		template?: boolean;
		terms?: string;
		topics?: string[];
		type?: PayloadType[];
	},
	sort: string,
	limit?: number
) {
	return async (connection: DatabaseConnection): Promise<Container[]> => {
		const containerResult = await connection.any(sql.typeAlias('container')`
			SELECT c.*
			FROM container c ${sort == 'priority' ? sql.fragment`LEFT JOIN task_priority ON c.guid = task` : sql.fragment``}
			WHERE ${prepareWhereCondition({ ...filters, organizations })}
			ORDER BY ${prepareOrderByExpression(sort)}
			${limit && Number.isInteger(limit) && limit >= 0 ? sql.fragment`LIMIT ${limit}` : sql.fragment``};
    `);

		return withUserAndRelation<Container>(connection, containerResult);
	};
}

export function getManyOrganizationContainers(
	filters: { default?: boolean; organizationCategories?: string[] },
	sort: string
) {
	return async (connection: DatabaseConnection): Promise<OrganizationContainer[]> => {
		const conditions = [
			sql.fragment`valid_currently`,
			sql.fragment`NOT deleted`,
			sql.fragment`payload->>'type' = ${payloadTypes.enum.organization}`
		];

		if (filters.default !== undefined) {
			conditions.push(sql.fragment`payload->>'default' = ${filters.default}`);
		}

		if (filters.organizationCategories?.length) {
			conditions.push(
				sql.fragment`payload->>'organizationCategory' IN (${sql.join(
					filters.organizationCategories,
					sql.fragment`, `
				)})`
			);
		}

		let orderBy = sql.fragment`valid_from DESC`;
		if (sort == 'alpha') {
			orderBy = sql.fragment`payload->>'default' DESC, payload->>'name'`;
		}

		const containerResult = await connection.any(sql.typeAlias('organizationContainer')`
			SELECT *
			FROM container
			WHERE ${sql.join(conditions, sql.fragment` AND `)}
			ORDER BY ${orderBy};
    `);

		return await withUserAndRelation<OrganizationContainer>(connection, containerResult);
	};
}

export function getManyOrganizationalUnitContainers(filters: { organization?: string }) {
	return async (connection: DatabaseConnection): Promise<OrganizationalUnitContainer[]> => {
		const conditions = [
			sql.fragment`valid_currently`,
			sql.fragment`NOT deleted`,
			sql.fragment`payload->>'type' = ${payloadTypes.enum.organizational_unit}`
		];
		if (filters.organization) {
			conditions.push(sql.fragment`organization = ${filters.organization}`);
		}

		const containerResult = await connection.any(sql.typeAlias('organizationalUnitContainer')`
			SELECT *
			FROM container
			WHERE ${sql.join(conditions, sql.fragment` AND `)}
			ORDER BY payload->>'level', payload->>'name'
    `);

		return await withUserAndRelation<OrganizationalUnitContainer>(connection, containerResult);
	};
}

export function getAllRelatedOrganizationalUnitContainers(guid: string) {
	return async (connection: DatabaseConnection): Promise<OrganizationalUnitContainer[]> => {
		const relationPathResult = await connection.any(sql.unsafe`
			WITH RECURSIVE is_part_of_relation(path) AS (
				--Top level items (roots)
				SELECT array[c.guid] as path, c.guid as subject
				FROM container c
				WHERE c.payload->>'type' = ${payloadTypes.enum.organizational_unit}
					AND c.valid_currently
					AND NOT EXISTS(
						--No relations with this as the subject.
						SELECT *
						FROM container_relation parent_test
						WHERE c.guid = parent_test.subject
						  AND parent_test.predicate = 'is-part-of'
							AND parent_test.valid_currently
							AND NOT parent_test.deleted
					)
				UNION ALL
				SELECT array_append(r.path, c.guid), c.guid
				FROM container c
				JOIN container_relation cr ON c.guid = cr.subject
					AND cr.predicate = 'is-part-of'
					AND cr.valid_currently
					AND NOT cr.deleted
				JOIN is_part_of_relation r ON cr.object = r.subject
				WHERE c.payload->>'type' = ${payloadTypes.enum.organizational_unit}
				  AND c.valid_currently
			)
			SELECT DISTINCT unnest(path) FROM is_part_of_relation r WHERE ${guid} = ANY(path)
		`);

		const containerResult =
			relationPathResult.length > 0
				? await connection.any(sql.typeAlias('organizationalUnitContainer')`
			SELECT *
			FROM container
			WHERE guid IN (${sql.join(
				relationPathResult.flatMap((r) => Object.values(r)),
				sql.fragment`, `
			)})
				AND valid_currently
			  AND NOT DELETED
			ORDER BY payload->>'level', payload->>'name'
		`)
				: [];

		return await withUserAndRelation<OrganizationalUnitContainer>(connection, containerResult);
	};
}

export function getAllRelatedContainers(
	organizations: string[],
	guid: string,
	relations: string[],
	filters: {
		assignees?: string[];
		audience?: string[];
		categories?: string[];
		measureTypes?: string[];
		organizationalUnits?: string[];
		policyFieldsBNK?: string[];
		strategyTypes?: string[];
		taskCategories?: string[];
		terms?: string;
		topics?: string[];
		type?: PayloadType[];
	},
	sort: string
) {
	return async (connection: DatabaseConnection): Promise<Container[]> => {
		const isPartOfResult = relations.includes(predicates.enum['is-part-of'])
			? await connection.any(sql.typeAlias('relationPath')`
				WITH RECURSIVE is_part_of_relation(path, is_cycle) AS (
					--Top level items (roots)
					SELECT array[c.guid] as path, false, c.guid as subject
					FROM container c
					WHERE c.valid_currently
						AND NOT EXISTS(
							--No relations with this as the subject.
							SELECT *
							FROM container_relation parent_test
							WHERE c.guid = parent_test.subject
							  AND parent_test.predicate IN (${predicates.enum['is-part-of']}, ${predicates.enum['is-part-of-measure']}, ${predicates.enum['is-part-of-strategy']})
								AND parent_test.valid_currently
								AND NOT parent_test.deleted
						)
					UNION ALL
					SELECT array_append(r.path, c.guid), c.guid = ANY(r.path), c.guid
					FROM container c
					JOIN container_relation cr ON c.guid = cr.subject
						AND cr.predicate IN (${predicates.enum['is-part-of']}, ${predicates.enum['is-part-of-measure']}, ${predicates.enum['is-part-of-strategy']})
					  AND cr.valid_currently
						AND NOT cr.deleted
					JOIN is_part_of_relation r ON cr.object = r.subject AND NOT r.is_cycle
					WHERE c.valid_currently
				)
				SELECT DISTINCT unnest(path) FROM is_part_of_relation r WHERE ${guid} = ANY(path)
			`)
			: [];

		const otherPredicates = new Set(relations);
		otherPredicates.delete(predicates.enum['is-part-of']);
		const otherRelationResult = otherPredicates.size
			? await connection.any(sql.typeAlias('relationPath')`
				SELECT cr.subject, cr.object
				FROM container_relation cr
				WHERE (cr.subject = ${guid} OR cr.object = ${guid})
          AND cr.predicate IN (${sql.join([...otherPredicates], sql.fragment`, `)})
					AND cr.valid_currently
					AND NOT cr.deleted
			`)
			: [];

		const containerResult = await connection.any(sql.typeAlias('container')`
			SELECT c.*
			FROM container c ${sort == 'priority' ? sql.fragment`LEFT JOIN task_priority ON guid = task` : sql.fragment``}
      WHERE c.guid IN (${sql.join(
				[...isPartOfResult, ...otherRelationResult, [guid]].flatMap((r) => Object.values(r)),
				sql.fragment`, `
			)})
				AND ${prepareWhereCondition({ ...filters, organizations })}
			ORDER BY ${prepareOrderByExpression(sort)}
		`);

		const objectivesAndEffects = containerResult
			.filter(
				({ payload }) =>
					payload.type == payloadTypes.enum.effect || payload.type == payloadTypes.enum.objective
			)
			.map(({ guid }) => guid);

		const includeIndicators =
			filters.type == undefined ||
			filters.type.length == 0 ||
			filters.type.includes(payloadTypes.enum.indicator);

		const indicatorResult =
			objectivesAndEffects.length > 0 && includeIndicators
				? await connection.any(sql.typeAlias('container')`
				SELECT DISTINCT(c.*)
				FROM container c
				JOIN container_relation cr ON c.guid = cr.object
					AND cr.predicate IN (${predicates.enum['is-measured-by']}, ${predicates.enum['is-objective-for']})
					AND cr.subject IN (${sql.join(objectivesAndEffects, sql.fragment`, `)})
					AND cr.valid_currently
					AND NOT cr.deleted
				WHERE c.valid_currently
					AND NOT c.deleted
			`)
				: [];

		return withUserAndRelation<Container>(connection, [...containerResult, ...indicatorResult]);
	};
}

export function getAllRelatedContainersByStrategyType(
	organizations: string[],
	strategyTypes: string[],
	filters: {
		audience?: string[];
		categories?: string[];
		measureTypes?: string[];
		organizationalUnits?: string[];
		policyFieldsBNK?: string[];
		terms?: string;
		topics?: string[];
		type?: PayloadType[];
	},
	sort: string
) {
	return async (connection: DatabaseConnection): Promise<Container[]> => {
		const relationPathResult = await connection.any(sql.typeAlias('relationPath')`
			SELECT co.guid, cr.subject
			FROM container co
			JOIN container_relation cr ON co.guid = cr.object
				AND cr.predicate = ${predicates.enum['is-part-of-strategy']}
				AND cr.valid_currently
				AND NOT cr.deleted
			WHERE co.organization IN (${sql.join(organizations, sql.fragment`, `)})
				AND co.payload->>'strategyType' IN (${sql.join(strategyTypes, sql.fragment`, `)})
		`);

		const containerResult =
			relationPathResult.length > 0
				? await connection.any(sql.typeAlias('container')`
					SELECT c.*
					FROM container c
					WHERE c.guid IN (${sql.join(
						relationPathResult.map((r) => Object.values(r)).flat(),
						sql.fragment`, `
					)})
						AND ${prepareWhereCondition({ ...filters, organizations })}
					ORDER BY ${prepareOrderByExpression(sort)}
				`)
				: [];

		return withUserAndRelation<Container>(connection, containerResult);
	};
}

export function getAllContainersWithIndicatorContributions(organizations: string[]) {
	return async (connection: DatabaseConnection): Promise<Container[]> => {
		const containerResult = await connection.any(sql.typeAlias('container')`
			SELECT c.*
			FROM container c
			WHERE ${prepareWhereCondition({ organizations })}
				AND (
					c.payload->>'indicatorContribution' IS NOT NULL
					OR c.payload->>'indicatorContribution' != '{}'
				)
		`);
		return containerResult.map((c) => ({
			...c,
			relation: [],
			user: []
		}));
	};
}

export function getAllContainersRelatedToIndicators(
	containers: IndicatorContainer[],
	filters: { organizationalUnits?: string[] }
) {
	return async (connection: DatabaseConnection): Promise<Container[]> => {
		if (containers.length == 0) {
			return [];
		}

		const indicatorResult = await connection.any(sql.typeAlias('guid')`
			SELECT c.guid
			FROM container c
			JOIN container_relation cr ON (c.guid = cr.subject OR c.guid = cr.object)
				AND cr.predicate = ${predicates.enum['is-affected-by']}
				AND cr.valid_currently
				AND NOT cr.deleted
			WHERE (cr.object IN (${sql.join(
				containers.map(({ guid }) => guid),
				sql.fragment`, `
			)}) OR cr.subject IN (${sql.join(
				containers.map(({ guid }) => guid),
				sql.fragment`, `
			)}))
			  AND guid NOT IN (${sql.join(
					containers.map(({ guid }) => guid),
					sql.fragment`, `
				)})
			  AND c.payload->>'type' = ${payloadTypes.enum.indicator}
        AND c.valid_currently
				AND NOT c.deleted
		`);

		const objectiveAndEffectResult = await connection.any(sql.typeAlias('guid')`
			SELECT c.guid
			FROM container c
			JOIN container_relation cr ON c.guid = cr.subject
				AND cr.predicate IN (${predicates.enum['is-measured-by']}, ${predicates.enum['is-objective-for']})
				AND cr.valid_currently
				AND NOT cr.deleted
			WHERE cr.object IN (${sql.join(
				containers.map(({ guid }) => guid),
				sql.fragment`, `
			)})
        AND c.valid_currently
				AND NOT c.deleted
		`);

		const isPartOfResult =
			objectiveAndEffectResult.length > 0
				? await connection.any(sql.typeAlias('guid')`
					WITH RECURSIVE is_part_of_relation(path, is_cycle) AS (
						--Top level items (roots)
						SELECT array[c.guid] AS path, false, c.guid AS subject
						FROM container c
						WHERE c.valid_currently
							AND NOT deleted
							AND NOT EXISTS(
								--No relations with this as the subject.
								SELECT *
								FROM container_relation parent_test
								WHERE c.guid = parent_test.subject
								  AND parent_test.predicate IN ('is-part-of', 'is-part-of-measure', 'is-part-of-strategy')
									AND parent_test.valid_currently
									AND NOT parent_test.deleted
							)
							UNION ALL
							SELECT array_append(r.path, c.guid), c.guid = ANY (r.path), c.guid
							FROM container c
							JOIN container_relation cr ON c.guid = cr.subject
								AND cr.predicate IN ('is-part-of', 'is-part-of-measure', 'is-part-of-strategy')
							  AND cr.valid_currently
							  AND NOT cr.deleted
							JOIN is_part_of_relation r ON cr.object = r.subject AND NOT r.is_cycle
							WHERE c.valid_currently
								AND NOT c.deleted
							)
					SELECT DISTINCT unnest(r.path) AS guid
					FROM is_part_of_relation r
					JOIN container c ON r.path[array_upper(r.path, 1)] = c.guid
					WHERE c.guid IN (${sql.join(
						objectiveAndEffectResult.map(({ guid }) => guid),
						sql.fragment`, `
					)})
				`)
				: [];

		const containerResult =
			isPartOfResult.length > 0
				? await connection.any(sql.typeAlias('container')`
					SELECT c.*
					FROM container c
					WHERE ${prepareWhereCondition({ ...filters })}
					  AND c.guid IN (${sql.join(
							[...isPartOfResult, ...indicatorResult].map(({ guid }) => guid),
							sql.fragment`, `
						)})
				`)
				: [];

		return withUserAndRelation<Container>(connection, containerResult);
	};
}

export function getAllContainersRelatedToStrategy(
	guid: string,
	filters: {
		audience?: string[];
		categories?: string[];
		policyFieldsBNK?: string[];
		terms?: string;
		topics?: string[];
		type?: PayloadType[];
	}
) {
	return async (connection: DatabaseConnection): Promise<Container[]> => {
		const predicate = [
			predicates.enum['is-part-of'],
			predicates.enum['is-part-of-measure'],
			predicates.enum['is-part-of-strategy']
		];

		const relationPathResult = await connection.any(sql.typeAlias('relationPath')`
			WITH RECURSIVE relation(path, is_cycle) AS (
				--Top level items (roots)
				SELECT array[c.guid] AS path, false, c.guid AS subject
				FROM container c
				WHERE c.valid_currently
					AND NOT EXISTS(
						--No relations with this as the subject.
						SELECT *
						FROM container_relation parent_test
						WHERE c.guid = parent_test.subject
							AND parent_test.predicate IN (${sql.join(predicate, sql.fragment`, `)})
							AND parent_test.valid_currently
							AND NOT parent_test.deleted
					)
				UNION ALL
				SELECT array_append(r.path, c.guid), c.guid = ANY(r.path), c.guid
				FROM container c
				JOIN container_relation cr ON c.guid = cr.subject
					AND cr.predicate IN (${sql.join(predicate, sql.fragment`, `)})
					AND cr.valid_currently
					AND NOT cr.deleted
				JOIN relation r ON cr.object = r.subject AND NOT r.is_cycle
				WHERE c.valid_currently
			)
			SELECT DISTINCT unnest(path) FROM relation r WHERE ${guid} = ANY(path)
		`);

		const containerResult =
			relationPathResult.length > 0
				? await connection.any(sql.typeAlias('container')`
					SELECT c.*
					FROM container c
					LEFT JOIN container_relation cr ON c.guid = cr.subject
						AND cr.predicate = 'is-part-of-strategy'
						AND cr.object = ${guid}
						AND cr.valid_currently
						AND NOT cr.deleted
					WHERE c.guid IN (${sql.join(
						relationPathResult.flatMap((r) => Object.values(r)),
						sql.fragment`, `
					)})
						AND ${prepareWhereCondition(filters)}
					ORDER BY cr.position;
				`)
				: [];

		const objectivesAndEffects = containerResult
			.filter(
				({ payload }) =>
					payload.type == payloadTypes.enum.effect || payload.type == payloadTypes.enum.objective
			)
			.map(({ guid }) => guid);

		const includeIndicators =
			filters.type == undefined ||
			filters.type.length == 0 ||
			filters.type.includes(payloadTypes.enum.indicator);

		const indicatorResult =
			objectivesAndEffects.length > 0 && includeIndicators
				? await connection.any(sql.typeAlias('container')`
				SELECT DISTINCT(c.*)
				FROM container c
				JOIN container_relation cr ON c.guid = cr.object
					AND cr.predicate IN (${predicates.enum['is-measured-by']}, ${predicates.enum['is-objective-for']})
					AND cr.subject IN (${sql.join(objectivesAndEffects, sql.fragment`, `)})
					AND cr.valid_currently
					AND NOT cr.deleted
				WHERE c.valid_currently
					AND NOT c.deleted
			`)
				: [];

		return withUserAndRelation<Container>(connection, [...containerResult, ...indicatorResult]);
	};
}

export function getAllContainersRelatedToMeasure(
	guid: string,
	filters: {
		assignees?: string[];
		categories?: string[];
		policyFieldsBNK?: string[];
		taskCategories?: string[];
		terms?: string;
		topics?: string[];
		type?: PayloadType[];
	},
	sort: string
) {
	return async (connection: DatabaseConnection): Promise<Container[]> => {
		const predicate = [
			predicates.enum['is-part-of'],
			predicates.enum['is-part-of-measure'],
			predicates.enum['is-part-of-strategy']
		];

		const relationPathResult = await connection.any(sql.typeAlias('relationPath')`
			WITH RECURSIVE relation(path, is_cycle) AS (
				--Top level items (roots)
				SELECT array[c.guid] AS path, false, c.guid as subject
				FROM container c
				WHERE c.valid_currently
					AND NOT EXISTS(
						--No relations with this as the subject.
						SELECT *
						FROM container_relation parent_test
						WHERE c.guid = parent_test.subject
						  AND parent_test.predicate IN (${sql.join(predicate, sql.fragment`, `)})
							AND parent_test.valid_currently
							AND NOT parent_test.deleted
					)
				UNION ALL
				SELECT array_append(r.path, c.guid), c.guid = ANY(r.path), c.guid
				FROM container c
				JOIN container_relation cr ON c.guid = cr.subject
					AND cr.predicate IN (${sql.join(predicate, sql.fragment`, `)})
					AND cr.valid_currently
					AND NOT cr.deleted
				JOIN relation r ON cr.object = r.subject AND NOT r.is_cycle
				WHERE c.valid_currently
			)
			SELECT DISTINCT unnest(path) FROM relation r WHERE ${guid} = ANY(path)
		`);

		const otherPredicate = [
			predicates.enum['contributes-to'],
			predicates.enum['is-consistent-with'],
			predicates.enum['is-duplicate-of'],
			predicates.enum['is-equivalent-to'],
			predicates.enum['is-inconsistent-with'],
			predicates.enum['is-prerequisite-for']
		];
		const otherRelationResult = await connection.any(sql.typeAlias('relationPath')`
			SELECT cr.subject, cr.object
			FROM container_relation cr
			WHERE (cr.subject = ${guid} OR cr.object = ${guid})
        AND cr.predicate IN (${sql.join(otherPredicate, sql.fragment`, `)})
				AND cr.valid_currently
				AND NOT cr.deleted
		`);

		const containerResult =
			[...relationPathResult, ...otherRelationResult].length > 0
				? await connection.any(sql.typeAlias('container')`
					SELECT c.*
					FROM container c
					${sort == 'priority' ? sql.fragment`LEFT JOIN task_priority ON guid = task` : sql.fragment``}
					WHERE c.guid IN (${sql.join(
						[...relationPathResult, ...otherRelationResult].flatMap((r) => Object.values(r)),
						sql.fragment`, `
					)})
						AND ${prepareWhereCondition(filters)}
					ORDER BY ${prepareOrderByExpression(sort)};
				`)
				: [];

		const effects = containerResult
			.filter(({ payload }) => payload.type == payloadTypes.enum.effect)
			.map(({ guid }) => guid);

		const includeIndicators =
			filters.type == undefined ||
			filters.type.length == 0 ||
			filters.type.includes(payloadTypes.enum.indicator);

		const indicatorResult =
			effects.length > 0 && includeIndicators
				? await connection.any(sql.typeAlias('container')`
				SELECT DISTINCT(c.*)
				FROM container c
				JOIN container_relation cr ON c.guid = cr.object
					AND cr.predicate = ${predicates.enum['is-measured-by']}
					AND cr.subject IN (${sql.join(effects, sql.fragment`, `)})
					AND cr.valid_currently
					AND NOT cr.deleted
				WHERE c.valid_currently
					AND NOT c.deleted
			`)
				: [];

		return withUserAndRelation<Container>(connection, [...containerResult, ...indicatorResult]);
	};
}

export function getAllContainersRelatedToUser(guid: string) {
	return async (connection: DatabaseConnection): Promise<AnyContainer[]> => {
		const containerResult = await connection.any(sql.typeAlias('anyContainer')`
			SELECT c.* FROM container c
			JOIN container m ON c.managed_by = m.guid
			JOIN container_user cu ON cu.subject = ${guid}
				AND cu.predicate = ${predicates.enum['is-member-of']}
				AND cu.object = m.revision
				AND m.valid_currently
				AND NOT m.deleted
			WHERE c.valid_currently
				AND NOT c.deleted
			UNION
			SELECT c.* FROM container c
			WHERE c.valid_currently
				AND NOT c.deleted
				AND c.payload->'assignee' ? ${guid}
			ORDER BY valid_from DESC
		`);
		return withUserAndRelation(connection, containerResult);
	};
}

export function createManyContainerRelations(relations: ReadonlyArray<Relation>) {
	return async (connection: DatabaseConnection) => {
		const values = relations.map((r) => [r.object, r.position, r.predicate, r.subject]);
		return await connection.any(sql.typeAlias('relation')`
			INSERT INTO container_relation (object, position, predicate, subject)
			SELECT *
			FROM ${sql.unnest(values, ['uuid', 'int4', 'text', 'uuid'])}
			ON CONFLICT (object, predicate, subject) WHERE valid_currently DO NOTHING
			RETURNING *
		`);
	};
}

export function updateManyContainerRelations(relations: ReadonlyArray<Relation>) {
	return async (connection: DatabaseConnection) => {
		const values = relations.map((r) => [r.object, r.position, r.predicate, r.subject]);
		return connection.transaction(async (txConnection) => {
			await txConnection.query(sql.typeAlias('void')`
				UPDATE container_relation cr
				SET valid_currently = false
				FROM ${sql.unnest(values, ['uuid', 'int4', 'text', 'uuid'])} AS u(object, position, predicate, subject)
				WHERE cr.object = u.object
				  AND cr.predicate = u.predicate
				  AND cr.subject = u.subject
					AND cr.valid_currently
			`);
			return createManyContainerRelations(relations)(txConnection);
		});
	};
}

export function deleteManyContainerRelations(relations: ReadonlyArray<Relation>) {
	return async (connection: DatabaseConnection) => {
		return connection.transaction(async (txConnection) => {
			const values = relations.map((r) => [r.object, r.position, r.predicate, r.subject]);
			await txConnection.query(sql.typeAlias('void')`
				UPDATE container_relation cr
				SET valid_currently = false
				FROM ${sql.unnest(values, ['uuid', 'int4', 'text', 'uuid'])} AS u(object, position, predicate, subject)
				WHERE cr.object = u.object AND cr.predicate = u.predicate AND cr.subject = u.subject
			`);
			await txConnection.query(sql.typeAlias('void')`
				INSERT INTO container_relation (object, position, predicate, subject, deleted)
				SELECT *, true
				FROM ${sql.unnest(values, ['uuid', 'int4', 'text', 'uuid'])}
			`);
		});
	};
}

export function getAllDirectContainerRelations(guid: string) {
	return async (connection: DatabaseConnection) => {
		return await connection.any(sql.typeAlias('relation')`
			SELECT object, position, predicate, subject
			FROM container_relation
			WHERE (subject = ${guid} OR object = ${guid})
				AND valid_currently
			  AND NOT deleted
		`);
	};
}

export function createUser(user: User) {
	return async (connection: DatabaseConnection) => {
		return await connection.one(sql.typeAlias('user')`
			INSERT INTO "user" (family_name, given_name, realm, guid, settings)
			VALUES (${user.family_name}, ${user.given_name}, ${user.realm}, ${user.guid}, ${sql.jsonb(<SerializableValue>user.settings)})
			RETURNING *
		`);
	};
}

export function createOrUpdateUser(user: User) {
	return async (connection: DatabaseConnection) => {
		return await connection.one(sql.typeAlias('user')`
			INSERT INTO "user" (family_name, given_name, realm, guid, settings)
			VALUES (${user.family_name}, ${user.given_name}, ${user.realm}, ${user.guid}, ${sql.jsonb(<SerializableValue>user.settings)})
			ON CONFLICT (guid) DO UPDATE SET family_name = ${user.family_name}, given_name = ${user.given_name}, settings = ${sql.jsonb(<SerializableValue>user.settings)}
			RETURNING *
		`);
	};
}

export function getUser(subject: string) {
	return async (connection: DatabaseConnection) => {
		return await connection.one(sql.typeAlias('user')`
			SELECT * FROM "user" WHERE guid = ${subject}
		`);
	};
}

export function getAllRelatedUsers(guid: string, predicates: Predicate[]) {
	return async (connection: DatabaseConnection) => {
		return await connection.any(sql.typeAlias('user')`
			SELECT DISTINCT u.*
			FROM "user" u
			JOIN container_user cu ON u.guid = cu.subject AND cu.predicate IN (${sql.join(
				predicates,
				sql.fragment`, `
			)})
			JOIN container c ON cu.object = c.revision AND c.valid_currently
			WHERE c.guid = ${guid}
			ORDER BY family_name, given_name
		`);
	};
}

export function getAllMembershipRelationsOfUser(guid: string) {
	return async (connection: DatabaseConnection) => {
		return await connection.any(sql.type(
			z.object({ predicate: predicates, object: z.string().uuid() })
		)`
			SELECT cu.predicate, c.guid AS object
			FROM container_user cu
			JOIN container c ON cu.object = c.revision AND c.valid_currently
			WHERE subject = ${guid};
		`);
	};
}

export function bulkUpdateOrganization(container: AnyContainer, organization: string) {
	return async (connection: DatabaseConnection) => {
		return connection.transaction(async (txConnection) => {
			const containerResult = await getAllRelatedContainers(
				[container.organization],
				container.guid,
				[predicates.enum['is-part-of']],
				{},
				''
			)(txConnection);
			if (containerResult.length) {
				await txConnection.query(sql.typeAlias('void')`
        	UPDATE container
        	SET organization = ${organization}
        	WHERE guid IN (${sql.join(
						containerResult.map(({ guid }) => guid),
						sql.fragment`, `
					)})
				`);
			}
		});
	};
}

export function bulkUpdateOrganizationalUnit(container: AnyContainer, organizationalUnit: string) {
	return async (connection: DatabaseConnection) => {
		return connection.transaction(async (txConnection) => {
			const containerResult = await getAllRelatedContainers(
				[container.organization],
				container.guid,
				[predicates.enum['is-part-of']],
				{},
				''
			)(txConnection);
			if (containerResult.length) {
				await txConnection.query(sql.typeAlias('void')`
					UPDATE container
					SET organizational_unit = ${organizationalUnit}
					WHERE guid IN (${sql.join(
						containerResult.map(({ guid }) => guid),
						sql.fragment`, `
					)})
				`);
			}
		});
	};
}

export function bulkUpdateManagedBy(container: AnyContainer, managedBy: string) {
	return async (connection: DatabaseConnection) => {
		return connection.transaction(async (txConnection) => {
			const containerResult =
				container.payload.type == payloadTypes.enum.strategy
					? await getAllContainersRelatedToStrategy(container.guid, {
							categories: [],
							topics: [],
							type: [
								payloadTypes.enum.goal,
								payloadTypes.enum.measure,
								payloadTypes.enum.objective,
								payloadTypes.enum.resolution,
								payloadTypes.enum.simple_measure,
								payloadTypes.enum.text
							]
						})(txConnection)
					: await getAllContainersRelatedToMeasure(
							container.guid,
							{
								type: [payloadTypes.enum.effect, payloadTypes.enum.goal, payloadTypes.enum.task]
							},
							''
						)(txConnection);

			if (containerResult.length) {
				await txConnection.query(sql.typeAlias('void')`
					UPDATE container
					SET managed_by = ${managedBy}
					WHERE guid IN (${sql.join(
						containerResult.map(({ guid }) => guid),
						sql.fragment`, `
					)})
					  AND managed_by = ${container.managed_by}
						AND valid_currently
						AND NOT deleted
				`);
			}
		});
	};
}

export function createOrUpdateTaskPriority(taskPriority: TaskPriority[]) {
	return async (connection: DatabaseConnection) => {
		const taskPriorityValues = taskPriority.map(({ priority, task }) => [priority, task]);
		const tasks = taskPriority.map(({ task }) => task);

		return connection.transaction(async (txConnection) => {
			await txConnection.query(sql.typeAlias('void')`
				DELETE FROM task_priority WHERE task IN (${sql.join(tasks, sql.fragment`,`)})
			`);
			await txConnection.query(sql.typeAlias('void')`
				INSERT INTO task_priority (priority, task)
				SELECT *
				FROM ${sql.unnest(taskPriorityValues, ['int4', 'uuid'])}
			`);
		});
	};
}

export function setUp(name: string, realm: string) {
	return async (connection: DatabaseConnection) => {
		return await createContainer({
			managed_by: '00000000-0000-0000-0000-000000000000',
			organization: '00000000-0000-0000-0000-000000000000',
			organizational_unit: null,
			payload: {
				boards: [],
				default: true,
				description: '',
				name,
				type: payloadTypes.enum.organization,
				visibility: visibility.enum.public
			},
			realm,
			relation: [],
			user: []
		})(connection);
	};
}
