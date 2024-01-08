import { error, redirect } from '@sveltejs/kit';
import { NotFoundError } from 'slonik';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import defineAbilityFor from '$lib/authorization';
import { payloadTypes } from '$lib/models';
import { getContainerBySlug } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals }) => {
	try {
		const container = await locals.pool.connect(getContainerBySlug('imprint'));
		return { container };
	} catch (e) {
		if (
			e instanceof NotFoundError &&
			defineAbilityFor(locals.user).can('create', payloadTypes.enum.page)
		) {
			throw redirect(302, '/page/new?slug=imprint');
		} else {
			throw error(404, { message: unwrapFunctionStore(_)('error.not_found') });
		}
	}
}) satisfies PageServerLoad;
