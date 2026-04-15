import { error, json } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { helpSlug } from '$lib/models';
import { getManyContainers } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET = (async ({ locals, params }) => {
	const parsedSlug = helpSlug.safeParse(params.slug);
	if (!parsedSlug.success) {
		error(404, { message: unwrapFunctionStore(_)('error.not_found') });
	}

	const containers = await locals.pool.connect(
		getManyContainers([], { helpSlugs: [parsedSlug.data] }, 'alpha')
	);

	return json(containers);
}) satisfies RequestHandler;
