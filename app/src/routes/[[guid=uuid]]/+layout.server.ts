import { error, redirect } from '@sveltejs/kit';
import { unwrapFunctionStore, _ } from 'svelte-i18n';
import { env } from '$env/dynamic/public';
import type { LayoutServerLoad } from './$types';

export const load = (async ({ params, parent, url }) => {
	let { currentOrganization, currentOrganizationalUnit, organizationalUnits } = await parent();

	if (!params.guid) {
		const baseURL = new URL(env.PUBLIC_BASE_URL ?? '');
		const newURL = new URL(baseURL);

		if (!currentOrganization.payload.default) {
			newURL.hostname = `${currentOrganization.guid}.${baseURL.hostname}`;
		}

		if (currentOrganizationalUnit) {
			newURL.pathname = `${currentOrganizationalUnit.guid}${url.pathname}`;
		} else {
			newURL.pathname = `${currentOrganization.guid}${url.pathname}`;
		}

		redirect(308, newURL.toString());
	}

	if (params.guid != currentOrganization.guid) {
		currentOrganizationalUnit = organizationalUnits.find(({ guid }) => guid === params.guid);
		if (!currentOrganizationalUnit) {
			error(404, { message: unwrapFunctionStore(_)('error.not_found') });
		}
	}

	return { currentOrganizationalUnit };
}) satisfies LayoutServerLoad;
