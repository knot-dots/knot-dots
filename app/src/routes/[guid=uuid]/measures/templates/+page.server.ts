import { fetchTemplates } from '$lib/load/templates';
import { payloadTypes } from '$lib/models';
import type { PageServerLoad } from './$types';

export const load = (async ({ depends, locals, parent, url }) => {
	depends('containers');

	const {
		categoryContext: rawCategoryContext,
		currentOrganization,
		currentOrganizationalUnit
	} = await parent();

	return fetchTemplates({
		pool: locals.pool,
		user: locals.user,
		url,
		rawCategoryContext,
		currentOrganization,
		currentOrganizationalUnit,
		templateTypes: [payloadTypes.enum.measure]
	});
}) satisfies PageServerLoad;
