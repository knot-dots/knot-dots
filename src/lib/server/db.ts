import { SchemaValidationError, createPool, createSqlTag } from 'slonik';
import type {
	DatabaseConnection,
	DatabasePool,
	Interceptor,
	QueryResultRow,
	SerializableValue
} from 'slonik';
import { z } from 'zod';
import { container, relation, user } from '$lib/models';
import type { Container, ContainerType, ModifiedContainer, NewContainer } from '$lib/models';

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
				throw new SchemaValidationError(
					actualQuery,
					row as SerializableValue,
					validationResult.error.issues
				);
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
	container: container.omit({ relation: true, user: true }),
	relation,
	relationPath: z.object({}).catchall(z.number().int().positive().nullable()),
	revision: z.object({ revision: z.number().int().positive() }),
	user,
	userWithRevision: user.extend({
		revision: z.number().int().positive()
	}),
	void: z.object({}).strict()
};

const sql = createSqlTag({ typeAliases });

export function createContainer(container: NewContainer) {
	return (connection: DatabaseConnection) => {
		return connection.transaction(async (txConnection) => {
			const containerResult = await txConnection.one(sql.typeAlias('container')`
          INSERT INTO container (type, payload, realm)
          VALUES (${container.type},
                  ${sql.jsonb(<SerializableValue>container.payload)},
                  ${container.realm})
          RETURNING *
      `);

			const userValues = container.user.map((u) => [u.issuer, containerResult.revision, u.subject]);
			const userResult = await txConnection.many(sql.typeAlias('user')`
          INSERT INTO container_user (issuer, revision, subject)
          SELECT *
          FROM ${sql.unnest(userValues, ['text', 'int4', 'uuid'])}
          RETURNING issuer, subject
      `);

			const relationValues = container.relation.map((r) => [
				r.object ?? containerResult.revision,
				r.predicate,
				r.subject ?? containerResult.revision
			]);
			await txConnection.query(sql.typeAlias('void')`
				INSERT INTO container_relation (object, predicate, subject)
				SELECT *
				FROM ${sql.unnest(relationValues, ['int4', 'text', 'int4'])}
      `);

			return { ...containerResult, user: userResult };
		});
	};
}

export function updateContainer(container: ModifiedContainer) {
	return (connection: DatabaseConnection) => {
		return connection.transaction(async (txConnection) => {
			await txConnection.query(sql.typeAlias('void')`
				UPDATE container
				SET valid_currently = false
				WHERE guid = ${container.guid}
			`);

			const containerResult = await txConnection.one(sql.typeAlias('container')`
				INSERT INTO container (type, payload, realm, guid)
				VALUES (
					${container.type},
					${sql.jsonb(<SerializableValue>container.payload)},
					${container.realm},
					${container.guid}
				)
				RETURNING *
      `);

			const userValues = container.user.map((u) => [u.issuer, containerResult.revision, u.subject]);
			const userResult = await txConnection.many(sql.typeAlias('user')`
				INSERT INTO container_user (issuer, revision, subject)
				SELECT *
				FROM ${sql.unnest(userValues, ['text', 'int4', 'uuid'])}
				RETURNING issuer, subject
      `);

			const relationValues = container.relation.map((r) => [
				r.object ?? containerResult.revision,
				r.predicate,
				r.subject ?? containerResult.revision
			]);
			await txConnection.query(sql.typeAlias('void')`
				INSERT INTO container_relation (object, predicate, subject)
				SELECT *
				FROM ${sql.unnest(relationValues, ['int4', 'text', 'int4'])}
      `);

			// Create new records for relations having this container as object.
			await txConnection.query(sql.typeAlias('void')`
				INSERT INTO container_relation (object, predicate, subject)
				SELECT ${containerResult.revision}, cr.predicate, cr.subject
				FROM container_relation cr
				JOIN container c ON c.revision = cr.object
				WHERE c.guid = ${container.guid}
				GROUP BY c.guid, cr.predicate, cr.subject
      `);

			return { ...containerResult, user: userResult };
		});
	};
}

export function getContainerByGuid(guid: string) {
	return async (connection: DatabaseConnection) => {
		const containerResult = await connection.one(sql.typeAlias('container')`
			SELECT *
			FROM container
			WHERE guid = ${guid}
				AND valid_currently;
		`);
		const userResult = await connection.any(sql.typeAlias('userWithRevision')`
			SELECT *
			FROM container_user
			WHERE revision = ${containerResult.revision}
		`);
		const relationResult = await connection.any(sql.typeAlias('relation')`
			SELECT *
			FROM container_relation
			WHERE subject = ${containerResult.revision}
		`);
		return {
			...containerResult,
			relation: relationResult.map((r) => r),
			user: userResult.map(({ issuer, subject }) => ({ issuer, subject }))
		};
	};
}

export function getManyContainers(categories: string[], sort: string) {
	return async (connection: DatabaseConnection) => {
		const conditions = [sql.fragment`valid_currently`];
		if (categories.length > 0) {
			conditions.push(
				sql.fragment`payload->>'category' IN (${sql.join(categories, sql.fragment`, `)})`
			);
		}

		let order_by = sql.fragment`valid_from`;
		if (sort == 'alpha') {
			order_by = sql.fragment`payload->>'title'`;
		}

		const containerResult = await connection.any(sql.typeAlias('container')`
			SELECT *
			FROM container
			WHERE ${sql.join(conditions, sql.fragment` AND `)}
			ORDER BY ${order_by};
    `);

		const userResult =
			containerResult.length > 0
				? await connection.any(sql.typeAlias('userWithRevision')`
						SELECT *
						FROM container_user
						WHERE revision IN (${sql.join(
							containerResult.map((c) => c.revision),
							sql.fragment`, `
						)})
					`)
				: [];

		return containerResult.map((c) => ({
			...c,
			user: userResult
				.filter((u) => u.revision === c.revision)
				.map(({ issuer, subject }) => ({ issuer, subject }))
		}));
	};
}

export function getAllRelationObjects(container: Container) {
	return async (connection: DatabaseConnection): Promise<Container[]> => {
		if (container.relation.length === 0) {
			return [];
		}
		const containerResult = await connection.any(sql.typeAlias('container')`
			SELECT *
			FROM container
			WHERE revision IN (${sql.join(
				container.relation.map((r) => r.object as number),
				sql.fragment`, `
			)})
				AND valid_currently
			ORDER BY payload->>'title' DESC;
		`);
		return containerResult.map((c) => ({ ...c, relation: [], user: [] }));
	};
}

export function maybePartOf(containerType: ContainerType) {
	return async (connection: DatabaseConnection) => {
		let candidateType: ContainerType;
		if (containerType == 'model') {
			candidateType = 'strategy';
		} else if (containerType == 'strategic_goal') {
			candidateType = 'model';
		} else if (containerType == 'operational_goal') {
			candidateType = 'strategic_goal';
		} else if (containerType == 'measure') {
			candidateType = 'operational_goal';
		} else {
			return [];
		}
		const containerResult = await connection.any(sql.typeAlias('container')`
			SELECT *
			FROM container
			WHERE type = ${candidateType} AND valid_currently
			ORDER BY payload->>'title' DESC
		`);

		const userResult =
			containerResult.length > 0
				? await connection.any(sql.typeAlias('userWithRevision')`
						SELECT *
						FROM container_user
						WHERE revision IN (${sql.join(
							containerResult.map((c) => c.revision),
							sql.fragment`, `
						)})
					`)
				: [];

		return containerResult.map((c) => ({
			...c,
			relation: [],
			user: userResult
				.filter((u) => u.revision === c.revision)
				.map(({ issuer, subject }) => ({ issuer, subject }))
		}));
	};
}

export function getAllRelatedContainers(guid: string) {
	return async (connection: DatabaseConnection) => {
		const revision = await connection.oneFirst(sql.typeAlias('revision')`
			SELECT revision FROM container WHERE guid = ${guid} AND valid_currently
		`);

		const relationPathResult = await connection.any(sql.typeAlias('relationPath')`
			SELECT s1.subject AS r1, s1.object AS r2, s2.subject AS r3, s2.object AS r4, s3.subject AS r5, s3.object AS r6, s4.subject AS r7, s4.object AS r8
			FROM
			(
				SELECT cr.subject, cr.predicate, cr.object, c.type
				FROM container c
				JOIN container_relation cr ON c.revision = cr.subject AND c.type = 'measure'
				WHERE c.valid_currently
			) s1
			FULL JOIN
			(
				SELECT cr.subject, cr.predicate, cr.object, c.type
				FROM container c
				JOIN container_relation cr ON c.revision = cr.subject AND c.type = 'operational_goal'
				WHERE c.valid_currently
			) s2 ON s1.object = s2.subject
			LEFT JOIN
			(
				SELECT cr.subject, cr.predicate, cr.object, c.type
				FROM container c
				JOIN container_relation cr ON c.revision = cr.subject AND c.type = 'strategic_goal'
				WHERE c.valid_currently
			) s3 ON s2.object = s3.subject
			LEFT JOIN
			(
				SELECT cr.subject, cr.predicate, cr.object, c.type
				FROM container c
				JOIN container_relation cr ON c.revision = cr.subject AND c.type = 'model'
				WHERE c.valid_currently
			) s4 ON s3.object = s4.subject
			WHERE s1.subject = ${revision}
				OR s1.object = ${revision}
				OR s2.subject = ${revision}
				OR s2.object = ${revision}
				OR s3.subject = ${revision}
				OR s3.object = ${revision}
				OR s4.subject = ${revision}
			  OR s4.object = ${revision}
		`);

		return connection.any(sql.typeAlias('container')`
			SELECT *
			FROM container
			WHERE revision IN (${sql.join(
				relationPathResult
					.map((r) => Object.values(r))
					.flat()
					.concat([revision]),
				sql.fragment`, `
			)})
				AND valid_currently
		`);
	};
}
