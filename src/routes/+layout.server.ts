import { error } from '@sveltejs/kit';
import { unwrapFunctionStore, _ } from 'svelte-i18n';
import { env } from '$env/dynamic/public';
import { getManyOrganizationContainers } from '$lib/server/db';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	let currentOrganization;

	const organizations = await locals.pool.connect(getManyOrganizationContainers('alpha'));

	if (url.hostname === new URL(env.PUBLIC_BASE_URL ?? '').hostname) {
		currentOrganization = organizations.find(({ payload }) => payload.default);
	} else {
		currentOrganization = organizations.find(({ payload }) =>
			url.hostname.startsWith(`${payload.slug}.`)
		);
	}

	if (!currentOrganization) {
		throw error(404, { message: unwrapFunctionStore(_)('error.not_found') });
	}

	return {
		currentOrganization,
		organizations
	};
};
