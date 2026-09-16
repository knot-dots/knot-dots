import { _, unwrapFunctionStore } from 'svelte-i18n';
import { fetchTemplates } from '$lib/load/templates';
import type { PageServerLoad } from './$types';

export const load = (async ({ depends, locals, parent, url }) => {
	depends('containers');

	const {
		categoryContext: rawCategoryContext,
		currentOrganization,
		currentOrganizationalUnit
	} = await parent();

	return {
		...fetchTemplates({
			pool: locals.pool,
			user: locals.user,
			url,
			rawCategoryContext,
			currentOrganization,
			currentOrganizationalUnit
		}),
		title: unwrapFunctionStore(_)('workspace.templates.title')
	};
}) satisfies PageServerLoad;
