import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { isContainerType } from '$lib/models';
import type { ContainerType } from '$lib/models';
import { maybePartOf } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ params, locals }) => {
	if (!isContainerType(params.type)) {
		error(404, { message: unwrapFunctionStore(_)('unknown_container_type') });
	}
	const isPartOfOptions = await locals.pool.connect(maybePartOf(params.type as ContainerType));
	return {
		isPartOfOptions
	};
}) satisfies PageServerLoad;
