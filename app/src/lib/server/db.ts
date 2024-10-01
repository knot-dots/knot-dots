import { SchemaValidationError, createPool, createSqlTag } from 'slonik';
import type {
	DatabaseConnection,
	DatabasePool,
	Interceptor,
	QueryResultRow,
	SerializableValue
} from 'slonik';
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
	organizationContainer: organizationContainer.omit({ relation: true, user: true }),
	organizationalUnitContainer: organizationalUnitContainer.omit({ relation: true, user: true }),
	relation,
	relationPath: z.object({}).catchall(z.number().int().positive().nullable()),
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
	return (connection: DatabaseConnection) => {
		return connection.transaction(async (txConnection) => {
			let organizationGuid;
			let organizationalUnitGuid;

			if (container.payload.type === payloadTypes.enum.organization) {
				organizationGuid = await createGroup(container.payload.name);
				await updateAccessSettings(organizationGuid);
			} else if (container.payload.type === payloadTypes.enum.organizational_unit) {
				organizationalUnitGuid = await createGroup(container.payload.name);
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

			const relationValues = container.relation.map((r) => [
				r.object ?? containerResult.revision,
				r.position,
				r.predicate,
				r.subject ?? containerResult.revision
			]);
			const relationResult = await txConnection.any(sql.typeAlias('relation')`
				INSERT INTO container_relation (object, position, predicate, subject)
				SELECT *
				FROM ${sql.unnest(relationValues, ['int8', 'int4', 'text', 'int8'])}
				ON CONFLICT DO NOTHING
				RETURNING *
      `);

			const isPartOfStrategyRelation = relationResult.find(
				({ predicate }) => predicate == predicates.enum['is-part-of-strategy']
			);
			if (isPartOfStrategyRelation) {
				await txConnection.any(sql.typeAlias(`void`)`
					UPDATE container_relation SET position = position + 1
					WHERE predicate = ${predicates.enum['is-part-of-strategy']}
						AND object = ${isPartOfStrategyRelation.object}
						AND subject != ${containerResult.revision}
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

			const relationValues = container.relation.map((r) => [
				r.object ?? containerResult.revision,
				r.position,
				r.predicate,
				r.subject ?? containerResult.revision
			]);
			await txConnection.query(sql.typeAlias('void')`
				INSERT INTO container_relation (object, position, predicate, subject)
				SELECT *
				FROM ${sql.unnest(relationValues, ['int8', 'int4', 'text', 'int8'])}
				ON CONFLICT DO NOTHING
      `);

			// Create new records for relations having this container as object.
			await txConnection.query(sql.typeAlias('void')`
				INSERT INTO container_relation (object, position, predicate, subject)
				SELECT DISTINCT ON (o.guid, cr.predicate, cr.subject) ${containerResult.revision}, cr.position, cr.predicate, cr.subject
				FROM container_relation cr
				JOIN container o ON o.revision = cr.object
				JOIN container s ON s.revision = cr.subject AND s.valid_currently
				WHERE o.guid = ${container.guid}
				ORDER BY o.guid, cr.predicate, cr.subject, cr.object DESC
				ON CONFLICT DO NOTHING
      `);

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
					await bulkUpdateManagedBy(previousRevision, containerResult)(txConnection);
				}
			} else if (
				container.payload.type == payloadTypes.enum.measure ||
				container.payload.type == payloadTypes.enum.simple_measure
			) {
				if (previousRevision.managed_by != container.managed_by) {
					await bulkUpdateManagedBy(previousRevision, containerResult)(txConnection);
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
				['hierarchical'],
				{},
				''
			)(txConnection);

			await deleteContainer(container)(txConnection);

			for (const part of findDescendants(container, parts)) {
				await deleteContainer({ ...part, user: container.user })(txConnection);
			}
		});
	};
}

export function updateContainerRelationPosition(relation: Relation[]) {
	return async (connection: DatabaseConnection) => {
		return connection.transaction(async (txConnection) => {
			await Promise.all(
				relation.map(({ object, predicate, subject }, position) =>
					txConnection.query(sql.typeAlias('void')`
						UPDATE container_relation SET position = ${position} WHERE object = ${object} AND predicate = ${predicate} AND subject = ${subject}
					`)
				)
			);
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
			JOIN container co ON cr.object = co.revision AND co.valid_currently
			JOIN container cs ON cr.subject = cs.revision AND cs.valid_currently
			WHERE subject = ${containerResult.revision} OR object = ${containerResult.revision}
			ORDER BY position
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
			JOIN container co ON cr.object = co.revision AND co.valid_currently
			JOIN container cs ON cr.subject = cs.revision AND cs.valid_currently
			WHERE subject = ${containerResult.revision} OR object = ${containerResult.revision}
			ORDER BY position
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
			JOIN container co ON cr.object = co.revision AND co.valid_currently
			JOIN container cs ON cr.subject = cs.revision AND cs.valid_currently
			WHERE subject IN (${revisions}) OR object IN (${revisions})
			ORDER BY position
		`);

		return containerResult.map((c) => ({
			...c,
			relation: relationResult.filter(
				({ object, subject }) => object === c.revision || subject === c.revision
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
	strategyTypes?: string[];
	taskCategories?: string[];
	template?: boolean;
	terms?: string;
	topics?: string[];
	type?: PayloadType[];
}) {
	const conditions = [
		sql.fragment`valid_currently`,
		sql.fragment`NOT deleted`,
		sql.fragment`payload->>'type' NOT IN ('organization', 'organizational_unit')`
	];
	if (filters.assignees?.length) {
		conditions.push(sql.fragment`payload->'assignee' ?| ${sql.array(filters.assignees, 'text')}`);
	}
	if (filters.audience?.length) {
		conditions.push(sql.fragment`payload->'audience' ?| ${sql.array(filters.audience, 'text')}`);
	}
	if (filters.categories?.length) {
		conditions.push(sql.fragment`payload->'category' ?| ${sql.array(filters.categories, 'text')}`);
	}
	if (filters.indicatorCategories?.length) {
		conditions.push(
			sql.fragment`payload->'indicatorCategory' ?| ${sql.array(
				filters.indicatorCategories,
				'text'
			)}`
		);
	}
	if (filters.indicatorTypes?.length) {
		conditions.push(
			sql.fragment`payload->'indicatorType' ?| ${sql.array(filters.indicatorTypes, 'text')}`
		);
	}
	if (filters.measureTypes?.length) {
		conditions.push(
			sql.fragment`payload->'measureType' ?| ${sql.array(filters.measureTypes, 'text')}`
		);
	}
	if (filters.organizations?.length) {
		conditions.push(
			sql.fragment`organization IN (${sql.join(filters.organizations, sql.fragment`, `)})`
		);
	}
	if (filters.organizationalUnits?.length) {
		conditions.push(
			sql.fragment`organizational_unit IN (${sql.join(
				filters.organizationalUnits,
				sql.fragment`, `
			)})`
		);
	}
	if (filters.strategyTypes?.length) {
		conditions.push(
			sql.fragment`payload->>'strategyType' IN (${sql.join(
				filters.strategyTypes,
				sql.fragment`, `
			)})`
		);
	}
	if (filters.taskCategories?.length) {
		conditions.push(
			sql.fragment`payload->>'taskCategory' IN (${sql.join(
				filters.taskCategories,
				sql.fragment`, `
			)})`
		);
	}
	if (filters.template) {
		conditions.push(sql.fragment`(payload->'template')::boolean`);
	} else {
		conditions.push(
			sql.fragment`(NOT (payload->'template')::boolean OR payload->'template' IS NULL)`
		);
	}
	if (filters.terms?.trim()) {
		conditions.push(
			sql.fragment`to_tsquery('german', ${filters.terms
				.trim()
				.split(' ')
				.map((t) => `${t}:*`)
				.join(' & ')}) @@ jsonb_to_tsvector('german', payload, '["string", "numeric"]')`
		);
	}
	if (filters.topics?.length) {
		conditions.push(sql.fragment`payload->'topic' ?| ${sql.array(filters.topics, 'text')}`);
	}
	if (filters.type?.length) {
		conditions.push(
			sql.fragment`payload->>'type' IN (${sql.join(filters.type, sql.fragment`, `)})`
		);
	}
	return sql.join(conditions, sql.fragment` AND `);
}

function prepareOrderByExpression(sort: string) {
	let order_by = sql.fragment`payload->>'title'`;
	if (sort == 'modified') {
		order_by = sql.fragment`valid_from DESC`;
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
		containerResult.map((c) => c.revision),
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

	const relationResult =
		containerResult.length > 0
			? await connection.any(sql.typeAlias('relation')`
				SELECT cr.*
				FROM container_relation cr
				JOIN container co ON cr.object = co.revision AND co.valid_currently
				JOIN container cs ON cr.subject = cs.revision AND cs.valid_currently
				WHERE object IN (${revisions}) OR subject IN (${revisions})
				ORDER BY position
			`)
			: [];

	return containerResult.map((c) => ({
		...c,
		relation: relationResult.filter(
			({ object, subject }) => object === c.revision || subject === c.revision
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
		strategyTypes?: string[];
		taskCategories?: string[];
		template?: boolean;
		terms?: string;
		topics?: string[];
		type?: PayloadType[];
	},
	sort: string
) {
	return async (connection: DatabaseConnection): Promise<Container[]> => {
		const containerResult = await connection.any(sql.typeAlias('container')`
			SELECT *
			FROM container ${sort == 'priority' ? sql.fragment`LEFT JOIN task_priority ON guid = task` : sql.fragment``}
			WHERE ${prepareWhereCondition({ ...filters, organizations })}
			ORDER BY ${prepareOrderByExpression(sort)};
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
		const revision = await connection.oneFirst(sql.typeAlias('revision')`
			SELECT revision FROM container WHERE guid = ${guid} AND valid_currently AND NOT deleted
		`);

		const relationPathResult = await connection.any(sql.typeAlias('relationPath')`
			WITH RECURSIVE is_part_of_relation(path) AS (
				--Top level items (roots)
				SELECT array[c.revision] as path, c.revision as subject
				FROM container c
				WHERE c.payload->>'type' = ${payloadTypes.enum.organizational_unit}
					AND c.valid_currently
					AND NOT EXISTS(
						--No relations with this as the subject.
						SELECT *
						FROM container_relation parent_test
						WHERE c.revision = parent_test.subject AND parent_test.predicate = 'is-part-of'
					)
				UNION ALL
				SELECT array_append(r.path, c.revision), c.revision
				FROM container c
				JOIN container_relation cr ON c.revision = cr.subject AND cr.predicate = 'is-part-of'
				JOIN is_part_of_relation r ON cr.object = r.subject
				WHERE c.payload->>'type' = ${payloadTypes.enum.organizational_unit}
				  AND c.valid_currently
			)
			SELECT DISTINCT unnest(path) FROM is_part_of_relation r WHERE ${revision} = ANY(path)
		`);

		const containerResult =
			relationPathResult.length > 0
				? await connection.any(sql.typeAlias('organizationalUnitContainer')`
			SELECT *
			FROM container
			WHERE revision IN (${sql.join(
				relationPathResult.map((r) => Object.values(r)).flat(),
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

export function maybePartOf(organizationOrOrganizationalUnit: string, containerType: PayloadType) {
	return async (connection: DatabaseConnection): Promise<AnyContainer[]> => {
		let candidateType: PayloadType[];
		if (containerType == 'model') {
			candidateType = ['strategy'];
		} else if (containerType == 'strategic_goal') {
			candidateType = ['model'];
		} else if (containerType == 'operational_goal') {
			candidateType = ['strategic_goal'];
		} else if (containerType == 'measure') {
			candidateType = ['operational_goal'];
		} else if (containerType == 'text') {
			candidateType = ['model', 'operational_goal', 'strategic_goal', 'strategy'];
		} else if (containerType == 'measure_result') {
			candidateType = ['vision'];
		} else if (containerType == 'milestone') {
			candidateType = ['measure_result'];
		} else if (containerType == 'task') {
			candidateType = ['milestone'];
		} else if (containerType == 'organizational_unit') {
			candidateType = ['organizational_unit'];
		} else {
			return [];
		}

		const containerResult = await connection.any(sql.typeAlias('anyContainer')`
			SELECT *
			FROM container
			WHERE (organization = ${organizationOrOrganizationalUnit} OR organizational_unit = ${organizationOrOrganizationalUnit})
			  AND payload->>'type' IN (${sql.join(candidateType, sql.fragment`,`)})
			  AND valid_currently
				AND NOT deleted
			ORDER BY payload->>'name' ASC, payload->>'title' ASC
		`);

		const userResult =
			containerResult.length > 0
				? await connection.any(sql.typeAlias('userRelationWithObject')`
					SELECT *
					FROM container_user
					WHERE object IN (${sql.join(
						containerResult.map((c) => c.revision),
						sql.fragment`, `
					)})
				`)
				: [];

		return containerResult.map((c) => ({
			...c,
			relation: [],
			user: userResult
				.filter((u) => u.object === c.revision)
				.map(({ predicate, subject }) => ({ predicate, subject }))
		}));
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
		organizationalUnits?: string[];
		strategyTypes?: string[];
		taskCategories?: string[];
		terms?: string;
		topics?: string[];
		type?: PayloadType[];
	},
	sort: string
) {
	return async (connection: DatabaseConnection): Promise<Container[]> => {
		const revision = await connection.oneFirst(sql.typeAlias('revision')`
			SELECT revision FROM container WHERE guid = ${guid} AND valid_currently AND NOT deleted
		`);

		const isPartOfResult = relations.includes(predicates.enum['is-part-of'])
			? await connection.any(sql.typeAlias('relationPath')`
				WITH RECURSIVE is_part_of_relation(path) AS (
					--Top level items (roots)
					SELECT array[c.revision] as path, c.revision as subject
					FROM container c
					WHERE c.valid_currently
						AND NOT EXISTS(
							--No relations with this as the subject.
							SELECT *
							FROM container_relation parent_test
							WHERE c.revision = parent_test.subject AND parent_test.predicate = ${predicates.enum['is-part-of']}
						)
					UNION ALL
					SELECT array_append(r.path, c.revision), c.revision
					FROM container c
					JOIN container_relation cr ON c.revision = cr.subject AND cr.predicate = ${predicates.enum['is-part-of']}
					JOIN is_part_of_relation r ON cr.object = r.subject
					WHERE c.valid_currently
				)
				SELECT DISTINCT unnest(path) FROM is_part_of_relation r WHERE ${revision} = ANY(path)
			`)
			: [];

		const otherPredicates = new Set(relations);
		otherPredicates.delete(predicates.enum['is-part-of']);
		const otherRelationResult = otherPredicates.size
			? await connection.any(sql.typeAlias('relationPath')`
				SELECT cr.subject, cr.object
				FROM container_relation cr
				JOIN container cs ON cs.revision = cr.subject
					AND cs.valid_currently
					AND cr.predicate IN (${sql.join([...otherPredicates], sql.fragment`, `)})
				JOIN container co ON co.revision = cr.object
					AND co.valid_currently
					AND cr.predicate IN (${sql.join([...otherPredicates], sql.fragment`, `)})
				WHERE cs.revision = ${revision} OR co.revision = ${revision}
			`)
			: [];

		const containerResult = await connection.any(sql.typeAlias('container')`
			SELECT *
			FROM container ${sort == 'priority' ? sql.fragment`LEFT JOIN task_priority ON guid = task` : sql.fragment``}
			WHERE revision IN (${sql.join(
				isPartOfResult
					.concat(otherRelationResult)
					.map((r) => Object.values(r))
					.flat()
					.concat([revision]),
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
			.map(({ revision }) => revision);

		const includeIndicators =
			filters.type == undefined ||
			filters.type.length == 0 ||
			filters.type.includes(payloadTypes.enum.indicator);

		const indicatorResult =
			objectivesAndEffects.length > 0 && includeIndicators
				? await connection.any(sql.typeAlias('container')`
				SELECT c.*
				FROM container c
				JOIN container_relation cr ON c.revision = cr.object
					AND cr.predicate = ${predicates.enum['is-objective-for']}
					AND cr.subject IN (${sql.join(objectivesAndEffects, sql.fragment`, `)})
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
		terms?: string;
		topics?: string[];
		type?: PayloadType[];
	},
	sort: string
) {
	return async (connection: DatabaseConnection): Promise<Container[]> => {
		const relationPathResult = await connection.any(sql.typeAlias('relationPath')`
			SELECT co.revision, cr.subject
			FROM container co
			LEFT JOIN container_relation cr ON co.revision = cr.object
				AND cr.predicate = ${predicates.enum['is-part-of-strategy']}
				AND co.valid_currently
			LEFT JOIN container cs ON cs.revision = cr.subject
				AND cr.predicate = ${predicates.enum['is-part-of-strategy']}
				AND	cs.valid_currently
			WHERE co.payload->>'strategyType' IN (${sql.join(strategyTypes, sql.fragment`, `)})
		`);

		const containerResult =
			relationPathResult.length > 0
				? await connection.any(sql.typeAlias('container')`
					SELECT *
					FROM container
					WHERE revision IN (${sql.join(
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
			SELECT *
			FROM container
			WHERE ${prepareWhereCondition({ organizations })}
				AND (
					payload->>'indicatorContribution' IS NOT NULL
					OR payload->>'indicatorContribution' != '{}'
				)
		`);
		return containerResult.map((c) => ({
			...c,
			relation: [],
			user: []
		}));
	};
}

export function getAllContainersRelatedToIndicator(container: IndicatorContainer) {
	return async (connection: DatabaseConnection): Promise<Container[]> => {
		const objectiveAndEffectResult = await connection.any(sql.typeAlias('revision')`
			SELECT c.revision
			FROM container c
			JOIN container_relation cr ON c.revision = cr.subject
				AND cr.predicate IN (${predicates.enum['is-measured-by']}, ${predicates.enum['is-objective-for']})
			WHERE cr.object = ${container.revision}
        AND c.valid_currently
				AND NOT c.deleted
		`);

		const isPartOfResult =
			objectiveAndEffectResult.length > 0
				? await connection.any(sql.typeAlias('revision')`
					WITH RECURSIVE is_part_of_relation(path) AS (
						--Top level items (roots)
						SELECT array[c.revision] AS path, c.revision, c.payload
						FROM container c
						WHERE c.valid_currently
							AND NOT deleted
							AND NOT EXISTS(
								--No relations with this as the subject.
								SELECT *
								FROM container_relation parent_test
								WHERE c.revision = parent_test.subject AND parent_test.predicate = 'is-part-of'
							)
							UNION ALL
							SELECT array_append(r.path, c.revision), c.revision, c.payload
							FROM container c
							JOIN container_relation cr ON c.revision = cr.subject AND cr.predicate = 'is-part-of'
							JOIN is_part_of_relation r ON cr.object = r.revision
							WHERE c.valid_currently
								AND NOT c.deleted
							)
					SELECT DISTINCT unnest(r.path) AS revision
					FROM is_part_of_relation r
					JOIN container c ON r.path[array_upper(r.path, 1)] = c.revision
					WHERE c.revision IN (${sql.join(
						objectiveAndEffectResult.map(({ revision }) => revision),
						sql.fragment`, `
					)})
				`)
				: [];

		const containerResult =
			isPartOfResult.length > 0
				? await connection.any(sql.typeAlias('container')`
					SELECT c.*
					FROM container c
					WHERE c.revision IN (${sql.join(
						isPartOfResult.map(({ revision }) => revision),
						sql.fragment`, `
					)})
				`)
				: [];

		return withUserAndRelation<Container>(connection, containerResult);
	};
}

export function getAllContainersRelatedToStrategy(
	revision: number,
	filters: { categories: string[]; terms?: string; topics: string[]; type?: PayloadType[] }
) {
	return async (connection: DatabaseConnection): Promise<Container[]> => {
		const predicate = [
			predicates.enum['is-part-of'],
			predicates.enum['is-part-of-measure'],
			predicates.enum['is-part-of-strategy']
		];

		const relationPathResult = await connection.any(sql.typeAlias('relationPath')`
				WITH RECURSIVE relation(path) AS (
					--Top level items (roots)
					SELECT array[c.revision] as path, c.revision as subject
					FROM container c
					WHERE c.valid_currently
						AND NOT EXISTS(
							--No relations with this as the subject.
							SELECT *
							FROM container_relation parent_test
							WHERE c.revision = parent_test.subject AND parent_test.predicate IN (${sql.join(predicate, sql.fragment`, `)})
						)
					UNION ALL
					SELECT array_append(r.path, c.revision), c.revision
					FROM container c
					JOIN container_relation cr ON c.revision = cr.subject AND cr.predicate IN (${sql.join(predicate, sql.fragment`, `)})
					JOIN relation r ON cr.object = r.subject
					WHERE c.valid_currently
				)
				SELECT DISTINCT unnest(path) FROM relation r WHERE ${revision} = ANY(path)
			`);

		const containerResult =
			relationPathResult.length > 0
				? await connection.any(sql.typeAlias('container')`
					SELECT c.*
					FROM container c
					LEFT JOIN container_relation cr ON c.revision = cr.subject
						AND cr.predicate = 'is-part-of-strategy'
						AND cr.object = ${revision}
					WHERE c.revision IN (${sql.join(
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
			.map(({ revision }) => revision);

		const includeIndicators =
			filters.type == undefined ||
			filters.type.length == 0 ||
			filters.type.includes(payloadTypes.enum.indicator);

		const indicatorResult =
			objectivesAndEffects.length > 0 && includeIndicators
				? await connection.any(sql.typeAlias('container')`
				SELECT c.*
				FROM container c
				JOIN container_relation cr ON c.revision = cr.object
					AND cr.predicate IN (${predicates.enum['is-measured-by']}, ${predicates.enum['is-objective-for']})
					AND cr.subject IN (${sql.join(objectivesAndEffects, sql.fragment`, `)})
				WHERE c.valid_currently
					AND NOT c.deleted
			`)
				: [];

		return withUserAndRelation<Container>(connection, [...containerResult, ...indicatorResult]);
	};
}

export function getAllContainersRelatedToMeasure(
	revision: number,
	filters: {
		assignees?: string[];
		categories?: string[];
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
			WITH RECURSIVE relation(path) AS (
				--Top level items (roots)
				SELECT array[c.revision] as path, c.revision as subject
				FROM container c
				WHERE c.valid_currently
					AND NOT EXISTS(
						--No relations with this as the subject.
						SELECT *
						FROM container_relation parent_test
						WHERE c.revision = parent_test.subject AND parent_test.predicate IN (${sql.join(predicate, sql.fragment`, `)})
					)
				UNION ALL
				SELECT array_append(r.path, c.revision), c.revision
				FROM container c
				JOIN container_relation cr ON c.revision = cr.subject AND cr.predicate IN (${sql.join(predicate, sql.fragment`, `)})
				JOIN relation r ON cr.object = r.subject
				WHERE c.valid_currently
			)
			SELECT DISTINCT unnest(path) FROM relation r WHERE ${revision} = ANY(path)
		`);

		const containerResult =
			relationPathResult.length > 0
				? await connection.any(sql.typeAlias('container')`
					SELECT c.*
					FROM container c
					${sort == 'priority' ? sql.fragment`LEFT JOIN task_priority ON guid = task` : sql.fragment``}
					WHERE c.revision IN (${sql.join(
						relationPathResult.flatMap((r) => Object.values(r)),
						sql.fragment`, `
					)})
						AND ${prepareWhereCondition(filters)}
					ORDER BY ${prepareOrderByExpression(sort)};
				`)
				: [];

		const effects = containerResult
			.filter(({ payload }) => payload.type == payloadTypes.enum.effect)
			.map(({ revision }) => revision);

		const includeIndicators =
			filters.type == undefined ||
			filters.type.length == 0 ||
			filters.type.includes(payloadTypes.enum.indicator);

		const indicatorResult =
			effects.length > 0 && includeIndicators
				? await connection.any(sql.typeAlias('container')`
				SELECT c.*
				FROM container c
				JOIN container_relation cr ON c.revision = cr.object
					AND cr.predicate = ${predicates.enum['is-measured-by']}
					AND cr.subject IN (${sql.join(effects, sql.fragment`, `)})
				WHERE c.valid_currently
					AND NOT c.deleted
			`)
				: [];

		return withUserAndRelation<Container>(connection, [...containerResult, ...indicatorResult]);
	};
}

export function createUser(user: User) {
	return async (connection: DatabaseConnection) => {
		return await connection.one(sql.typeAlias('user')`
			INSERT INTO "user" (family_name, given_name, realm, guid)
			VALUES (${user.family_name}, ${user.given_name}, ${user.realm}, ${user.guid})
			RETURNING *
		`);
	};
}

export function createOrUpdateUser(user: User) {
	return async (connection: DatabaseConnection) => {
		return await connection.one(sql.typeAlias('user')`
			INSERT INTO "user" (family_name, given_name, realm, guid)
			VALUES (${user.family_name}, ${user.given_name}, ${user.realm}, ${user.guid})
			ON CONFLICT (guid) DO UPDATE SET family_name = ${user.family_name}, given_name = ${user.given_name}
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
				['hierarchical'],
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
				['hierarchical'],
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

export function bulkUpdateManagedBy(
	container: AnyContainer,
	managedBy: { guid: string; revision: number }
) {
	return async (connection: DatabaseConnection) => {
		return connection.transaction(async (txConnection) => {
			const containerResult =
				container.payload.type == payloadTypes.enum.strategy
					? await getAllContainersRelatedToStrategy(managedBy.revision, {
							categories: [],
							topics: [],
							type: [
								payloadTypes.enum.measure,
								payloadTypes.enum.model,
								payloadTypes.enum.objective,
								payloadTypes.enum.operational_goal,
								payloadTypes.enum.resolution,
								payloadTypes.enum.simple_measure,
								payloadTypes.enum.strategic_goal,
								payloadTypes.enum.text,
								payloadTypes.enum.vision
							]
						})(txConnection)
					: await getAllContainersRelatedToMeasure(
							managedBy.revision,
							{
								type: [
									payloadTypes.enum.effect,
									payloadTypes.enum.measure_result,
									payloadTypes.enum.milestone,
									payloadTypes.enum.task
								]
							},
							''
						)(txConnection);

			if (containerResult.length) {
				await txConnection.query(sql.typeAlias('void')`
					UPDATE container
					SET managed_by = ${managedBy.guid}
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
