import { error, json } from '@sveltejs/kit';
import { NotFoundError } from 'slonik';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { env } from '$env/dynamic/public';
import defineAbilityFor from '$lib/authorization';
import { helpSlug, newContainer, payloadTypes, predicates } from '$lib/models';
import { createContainer, getManyContainers, getManyOrganizationContainers } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET = (async ({ locals, params }) => {
	const parsedSlug = helpSlug.safeParse(params.slug);
	if (!parsedSlug.success) {
		error(404, { message: unwrapFunctionStore(_)('error.not_found') });
	}

	try {
		const containers = await locals.pool.connect(
			getManyContainers([], { helpSlugs: [parsedSlug.data] }, 'alpha')
		);
		return json(containers);
	} catch (e) {
		if (
			e instanceof NotFoundError &&
			defineAbilityFor(locals.user).can('create', payloadTypes.enum.help)
		) {
			const organizations = await locals.pool.connect(
				getManyOrganizationContainers({ default: true }, '')
			);
			const container = await locals.pool.connect(
				createContainer(
					newContainer.parse({
						payload: {
							body: '',
							slug: [parsedSlug.data],
							title: '',
							type: payloadTypes.enum.help
						},
						managed_by: organizations[0].guid,
						organization: organizations[0].guid,
						organizational_unit: null,
						realm: env.PUBLIC_KC_REALM,
						user: [{ predicate: predicates.enum['is-creator-of'], subject: locals.user.guid }]
					})
				)
			);
			return json([container]);
		} else {
			error(404, { message: unwrapFunctionStore(_)('error.not_found') });
		}
	}
}) satisfies RequestHandler;
