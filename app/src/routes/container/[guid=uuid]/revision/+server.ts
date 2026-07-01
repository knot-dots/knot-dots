import { error, json } from '@sveltejs/kit';
import { NotFoundError } from 'slonik';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { deepEqual } from 'ts-deep-equal';
import defineAbilityFor, { filterVisible } from '$lib/authorization';
import {
	etag,
	isContainerWithEditorialState,
	isIndicatorTemplateContainer,
	isOrganizationContainer,
	modifiedContainer,
	predicates
} from '$lib/models';
import {
	getAllContainerRevisionsByGuid,
	getContainerByGuid,
	updateContainer
} from '$lib/server/db';
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
		const ability = defineAbilityFor(locals.user);
		if (ability.cannot('update', container)) {
			error(403, { message: unwrapFunctionStore(_)('error.forbidden') });
		}
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
		if (
			isOrganizationContainer(container) &&
			isOrganizationContainer(parseResult.data) &&
			parseResult.data.payload.customDomain !== container.payload.customDomain &&
			ability.cannot('update', container, 'payload.customDomain')
		) {
			error(403, { message: unwrapFunctionStore(_)('error.forbidden') });
		}
		if (
			isIndicatorTemplateContainer(container) &&
			isIndicatorTemplateContainer(parseResult.data) &&
			JSON.stringify(parseResult.data.payload.indicatorCategory) !==
				JSON.stringify(container.payload.indicatorCategory) &&
			ability.cannot('update', container, 'indicatorCategory')
		) {
			error(403, { message: unwrapFunctionStore(_)('error.forbidden') });
		}
		if (
			isContainerWithEditorialState(container) &&
			isContainerWithEditorialState(parseResult.data) &&
			parseResult.data.payload.editorialState !== container.payload.editorialState &&
			ability.cannot('update', container, 'payload.editorialState')
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
					(prevOrganizationalUnit && previousContainer.managed_by === prevOrganizationalUnit) ||
					(!prevOrganizationalUnit &&
						previousContainer.managed_by === previousContainer.organization);
				if (shouldAdopt) {
					managed_by = newOrganizationalUnit;
				}
			} else if (
				prevOrganizationalUnit &&
				previousContainer.managed_by === prevOrganizationalUnit
			) {
				// Case 2: removing organizational unit
				managed_by = previousContainer.organization;
			}
		}

		let aiContribution;

		if (
			'aiContribution' in container.payload &&
			container.payload.aiContribution == 1 &&
			'aiContribution' in parseResult.data.payload
		) {
			const { aiContribution: _, ...originalPayload } = container.payload;
			const { aiContribution: __, ...currentPayload } = parseResult.data.payload;
			aiContribution = deepEqual(originalPayload, currentPayload) ? 1 : 0.5;
		}

		const result = await locals.pool.connect(
			updateContainer({
				...parseResult.data,
				payload: {
					...parseResult.data.payload,
					...(aiContribution !== undefined ? { aiContribution } : undefined)
				},
				managed_by,
				user: [
					...parseResult.data.user.filter(
						({ predicate }) => predicate != predicates.enum['is-creator-of']
					),
					{ predicate: predicates.enum['is-creator-of'], subject: locals.user.guid }
				]
			})
		);
		return json(result, { status: 201, headers: { location: `/container/${result.guid}` } });
	}
}) satisfies RequestHandler;
