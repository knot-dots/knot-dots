import { error, json } from '@sveltejs/kit';
import { NotFoundError } from 'slonik';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { env } from '$env/dynamic/public';
import defineAbilityFor from '$lib/authorization';
import { newContainer, payloadTypes, predicates } from '$lib/models';
import { createContainer, getContainerBySlug, getManyOrganizationContainers } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET = (async ({ locals, params }) => {
	try {
		const container = await locals.pool.connect(getContainerBySlug(params.slug));
		return json(container);
	} catch (e) {
		if (
			e instanceof NotFoundError &&
			defineAbilityFor(locals.user).can('create', payloadTypes.enum.page)
		) {
			const organizations = await locals.pool.connect(
				getManyOrganizationContainers({ default: true }, '')
			);
			const container = await locals.pool.connect(
				createContainer(
					newContainer.parse({
						payload: { body: '', slug: params.slug, title: '', type: payloadTypes.enum.page },
						organization: organizations[0].guid,
						organizational_unit: null,
						realm: env.PUBLIC_KC_REALM,
						user: [{ predicate: predicates.enum['is-creator-of'], subject: locals.user.guid }]
					})
				)
			);
			return json(container);
		} else {
			throw error(404, { message: unwrapFunctionStore(_)('error.not_found') });
		}
	}
}) satisfies RequestHandler;
