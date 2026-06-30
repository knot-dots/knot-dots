import { env } from '$env/dynamic/public';
import { json } from '@sveltejs/kit';
import { getManyOrganizationContainers, getManyOrganizationalUnitContainers } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies, url, locals }) => {
	const [organizations, organizationalUnits] = await Promise.all([
		locals.pool.connect(getManyOrganizationContainers({}, 'alpha')),
		locals.pool.connect(getManyOrganizationalUnitContainers({}))
	]);

	const baseHostname = new URL(env.PUBLIC_BASE_URL ?? 'http://localhost:5173').hostname;
	const rememberedOrganizationGuid = env.PUBLIC_DONT_USE_SUBDOMAINS
		? cookies.get('current-organization-guid')
		: undefined;
	const rememberedOrganization =
		rememberedOrganizationGuid !== undefined
			? organizations.find(({ guid }) => guid === rememberedOrganizationGuid)
			: undefined;

	let currentOrganization = rememberedOrganization;
	if (!currentOrganization) {
		if (env.PUBLIC_DONT_USE_SUBDOMAINS) {
			currentOrganization =
				organizations.find(({ payload }) => payload.default) ?? organizations[0];
		} else if (url.hostname === baseHostname) {
			currentOrganization =
				organizations.find(({ payload }) => payload.default) ?? organizations[0];
		} else {
			currentOrganization =
				organizations.find(({ guid, payload }) => {
					const slug = payload.slug?.toLowerCase();

					return (
						url.hostname.startsWith(`${guid}.`) ||
						(slug ? url.hostname.startsWith(`${slug}.`) : false) ||
						url.hostname === payload.customDomain
					);
				}) ??
				organizations.find(({ payload }) => payload.default) ??
				organizations[0];
		}
	}

	return json({
		currentOrganizationGuid: currentOrganization?.guid ?? null,
		organizations: organizations.map((organization) => ({
			guid: organization.guid,
			slug: organization.payload.slug
		})),
		organizationalUnits: organizationalUnits.map((organizationalUnit) => ({
			guid: organizationalUnit.guid,
			organization: organizationalUnit.organization,
			slug: organizationalUnit.payload.slug
		}))
	});
};
