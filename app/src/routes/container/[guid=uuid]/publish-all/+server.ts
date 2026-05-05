import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import {
	isOrganizationalUnitContainer,
	isOrganizationContainer,
	modifiedContainer,
	predicates,
	visibility
} from '$lib/models';
import { getContainerByGuid, getManyContainers, updateContainer } from '$lib/server/db';
import defineAbilityFor from '$lib/authorization';
import type { RequestHandler } from './$types';
import { NotFoundError } from 'slonik';

export const POST = (async ({ locals, params }) => {
	if (!locals.user.isAuthenticated) {
		error(401, { message: unwrapFunctionStore(_)('error.unauthorized') });
	}

	const ability = defineAbilityFor(locals.user);

	try {
		await locals.pool.transaction(async (connection) => {
			const container = await getContainerByGuid(params.guid)(connection);

			if (!isOrganizationContainer(container) && !isOrganizationalUnitContainer(container)) {
				error(404, { message: unwrapFunctionStore(_)('error.not_found') });
			}

			if (!ability.can('update', container)) {
				error(403, { message: unwrapFunctionStore(_)('error.forbidden') });
			}

			if (container.payload.visibility != visibility.enum.public) {
				await updateContainer(
					modifiedContainer.parse({
						...container,
						payload: {
							...container.payload,
							visibility: visibility.enum['public']
						},
						user: [
							{
								predicate: predicates.enum['is-creator-of'],
								subject: locals.user.guid
							}
						]
					})
				)(connection);
			}

			for (const c of await getManyContainers(
				[container.organization],
				{
					organizationalUnits: isOrganizationalUnitContainer(container) ? [container.guid] : []
				},
				'alpha'
			)(connection)) {
				if (ability.can('update', c) && c.payload.visibility != visibility.enum.public)
					await updateContainer(
						modifiedContainer.parse({
							...c,
							payload: {
								...c.payload,
								visibility: visibility.enum['public']
							},
							user: [
								{
									predicate: predicates.enum['is-creator-of'],
									subject: locals.user.guid
								}
							]
						})
					)(connection);
			}
		});
	} catch (e: unknown) {
		if (e instanceof NotFoundError) {
			error(404, { message: unwrapFunctionStore(_)('error.not_found') });
		} else {
			throw e;
		}
	}

	return new Response(null, { status: 204 });
}) satisfies RequestHandler;
