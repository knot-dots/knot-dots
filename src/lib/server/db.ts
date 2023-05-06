import { SchemaValidationError, createPool, createSqlTag } from 'slonik';
import type {
	DatabaseConnection,
	DatabasePool,
	Interceptor,
	QueryResultRow,
	SerializableValue
} from 'slonik';
import { z } from 'zod';
import { containerTypes, sustainableDevelopmentGoals } from '$lib/models';
import type { ContainerType } from '$lib/models';

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

const user = z.object({
	issuer: z.string().url().max(1024),
	subject: z.string().uuid()
});

const userWithRevision = user.extend({
	revision: z.number().int().positive()
});

const container = z.object({
	guid: z.string().uuid(),
	type: containerTypes,
	payload: z.object({
		category: sustainableDevelopmentGoals,
		description: z.string(),
		summary: z.string().max(200).optional(),
		title: z.string()
	}),
	realm: z.string().max(1024),
	revision: z.number().int().positive(),
	valid_currently: z.boolean(),
	valid_from: z.number().int()
});

const containerWithUser = container.extend({ user: z.array(user) });

const newContainer = containerWithUser.omit({
	guid: true,
	revision: true,
	valid_currently: true,
	valid_from: true
});

const modifiedContainer = containerWithUser.omit({
	revision: true,
	valid_currently: true,
	valid_from: true
});

const relation = z.object({
	object: z.number().int().positive(),
	predicate: z.string().max(128),
	subject: z.number().int().positive()
});

const typeAliases = {
	container,
	relation,
	user,
	userWithRevision,
	void: z.object({}).strict()
};

export type User = z.infer<typeof user>;

export type Container = z.infer<typeof containerWithUser>;

export type NewContainer = z.infer<typeof newContainer>;

export type ModifiedContainer = z.infer<typeof modifiedContainer>;

export type Relation = z.infer<typeof relation>;

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
		return {
			...containerResult,
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
			user: userResult
				.filter((u) => u.revision === c.revision)
				.map(({ issuer, subject }) => ({ issuer, subject }))
		}));
	};
}
