import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';
import type { LayoutServerLoad } from './$types';

export const load = (async ({ params, parent, url }) => {
	const { currentOrganization, currentOrganizationalUnit } = await parent();

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

	return {};
}) satisfies LayoutServerLoad;
