import { error, json } from '@sveltejs/kit';
import { NotFoundError, UniqueIntegrityConstraintViolationError } from 'slonik';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import defineAbilityFor, { filterVisible } from '$lib/authorization';
import { etag, modifiedContainer, predicates, type AnyPayload } from '$lib/models';
import { isProtectedContainerRelationPredicate } from '$lib/relations';
import {
	getAllContainerRevisionsByGuid,
	getContainerByGuid,
	updateContainer
} from '$lib/server/db';
import { applyComputedManagedBy } from '$lib/server/computeManagedBy';
import { authorizeContainerUpdate, ContainerUpdateError } from '$lib/server/containerUpdate';
import type { RequestHandler } from './$types';

export const GET = (async ({ locals, params }) => {
	try {
		return json(
			filterVisible(
				await locals.pool.connect(getAllContainerRevisionsByGuid(params.guid)),
				locals.user
			)
		);
	} catch (e) {
		if (e instanceof NotFoundError) {
			error(404, { message: unwrapFunctionStore(_)('error.not_found') });
		} else {
			throw e;
		}
	}
}) satisfies RequestHandler;

export const POST = (async ({ locals, params, request }) => {
	if (!locals.user.isAuthenticated) {
		error(401, { message: unwrapFunctionStore(_)('error.unauthorized') });
	}

	if (request.headers.get('Content-Type') != 'application/json') {
		error(415, { message: unwrapFunctionStore(_)('error.unsupported_media_type') });
	}

	const container = await locals.pool.connect(getContainerByGuid(params.guid)).catch((reason) => {
		if (reason instanceof NotFoundError) {
			error(404, { message: unwrapFunctionStore(_)('error.not_found') });
		} else {
			throw reason;
		}
	});

	if (request.headers.has('If-Match') && etag(container) != request.headers.get('If-Match')) {
		error(412, { message: unwrapFunctionStore(_)('error.precondition_failed') });
	}

	const data = await request.json().catch((reason: SyntaxError) => {
		error(400, { message: reason.message });
	});
	const parseResult = modifiedContainer.safeParse(data);

	if (!parseResult.success) {
		error(422, parseResult.error);
	} else {
		let payload: AnyPayload;
		try {
			payload = authorizeContainerUpdate({
				current: container,
				next: parseResult.data,
				user: locals.user
			});
		} catch (e) {
			if (e instanceof ContainerUpdateError) {
				error(e.kind === 'forbidden' ? 403 : 422, {
					message: unwrapFunctionStore(_)(
						e.kind === 'forbidden' ? 'error.forbidden' : 'error.unprocessable_entity'
					)
				});
			}
			throw e;
		}
		const ability = defineAbilityFor(locals.user);
		const protectedRelations = container.relation.filter(({ predicate }) =>
			isProtectedContainerRelationPredicate(predicate)
		);
		const hasSpoofedProtectedRelation = parseResult.data.relation
			.filter(({ predicate }) => isProtectedContainerRelationPredicate(predicate))
			.some(
				(submitted) =>
					!protectedRelations.some(
						(current) =>
							current.object === submitted.object &&
							current.predicate === submitted.predicate &&
							current.subject === submitted.subject &&
							current.position === submitted.position
					)
			);
		if (hasSpoofedProtectedRelation) {
			error(422, { message: unwrapFunctionStore(_)('error.unprocessable_entity') });
		}
		const relations = [
			...parseResult.data.relation.filter(
				({ predicate }) => !isProtectedContainerRelationPredicate(predicate)
			),
			...protectedRelations
		];
		if (
			parseResult.data.organization !== container.organization &&
			ability.cannot('update', container, 'organization')
		) {
			error(403, { message: unwrapFunctionStore(_)('error.forbidden') });
		}
		if (
			parseResult.data.organizational_unit !== container.organizational_unit &&
			ability.cannot('update', container, 'organizational_unit')
		) {
			error(403, { message: unwrapFunctionStore(_)('error.forbidden') });
		}

		// Auto-transfer managed_by when organizational_unit changes.
		// Rules:
		// 1. If organizational_unit changed from previous value to a new non-null value
		//    and previous managed_by was the previous organizational_unit OR (previous org_unit was null and managed_by == organization),
		//    then set managed_by to new organizational_unit.
		// 2. If organizational_unit changed from a non-null value to null and previous managed_by == previous organizational_unit,
		//    then set managed_by back to organization.
		// 3. Otherwise keep provided managed_by (allow explicit overrides).
		const previousContainer = container; // earlier fetched container
		let managed_by = parseResult.data.managed_by;
		if (parseResult.data.organizational_unit !== previousContainer.organizational_unit) {
			const newOrganizationalUnit = parseResult.data.organizational_unit; // may be null
			const prevOrganizationalUnit = previousContainer.organizational_unit; // may be null
			if (newOrganizationalUnit) {
				// Case 1: assigning a organizational unit
				const shouldAdopt =
					(prevOrganizationalUnit && previousContainer.managed_by[0] === prevOrganizationalUnit) ||
					(!prevOrganizationalUnit &&
						previousContainer.managed_by[0] === previousContainer.organization);
				if (shouldAdopt) {
					managed_by = [newOrganizationalUnit];
				}
			} else if (
				prevOrganizationalUnit &&
				previousContainer.managed_by[0] === prevOrganizationalUnit
			) {
				// Case 2: removing organizational unit
				managed_by = [previousContainer.organization];
			}
		}

		try {
			const result = await locals.pool.connect(async (connection) => {
				const updated = await updateContainer({
					...parseResult.data,
					relation: relations,
					payload,
					// the own-matrix marker is owned by the grant endpoints, so
					// revisions always carry the stored value forward
					own_matrix: container.own_matrix,
					managed_by,
					user: [
						...parseResult.data.user.filter(
							({ predicate }) => predicate != predicates.enum['is-creator-of']
						),
						{ predicate: predicates.enum['is-creator-of'], subject: locals.user.guid }
					]
				})(connection);
				// Give the client the same view a fresh read would produce, so it can
				// update its state without a reload.
				const [withComputed] = await applyComputedManagedBy(connection, [updated]);
				return withComputed;
			});
			return json(result, { status: 201, headers: { location: `/container/${result.guid}` } });
		} catch (e: unknown) {
			if (
				e instanceof UniqueIntegrityConstraintViolationError &&
				(e.constraint == 'container_payload_organization_slug_key' ||
					e.constraint == 'container_payload_organizational_unit_slug_key')
			) {
				error(409, { message: unwrapFunctionStore(_)('error.slug_not_available') });
			} else {
				throw e;
			}
		}
	}
}) satisfies RequestHandler;
