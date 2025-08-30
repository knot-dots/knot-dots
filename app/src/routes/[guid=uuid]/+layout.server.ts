import { error } from '@sveltejs/kit';
import { unwrapFunctionStore, _ } from 'svelte-i18n';
import type { LayoutServerLoad } from './$types';

export const load = (async ({ params, parent }) => {
	const { currentOrganization, organizationalUnits } = await parent();

	let currentOrganizationalUnit;

	if (params.guid != currentOrganization.guid) {
		currentOrganizationalUnit = organizationalUnits.find(({ guid }) => guid === params.guid);
		if (!currentOrganizationalUnit) {
			error(404, { message: unwrapFunctionStore(_)('error.not_found') });
		}
	}

	return { currentOrganizationalUnit };
}) satisfies LayoutServerLoad;
