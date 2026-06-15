import { env } from '$env/dynamic/public';
import { json } from '@sveltejs/kit';
import { getManyOrganizationContainers, getManyOrganizationalUnitContainers } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	const [organizations, organizationalUnits] = await Promise.all([
		locals.pool.connect(getManyOrganizationContainers({}, 'alpha')),
		locals.pool.connect(getManyOrganizationalUnitContainers({}))
	]);

	const baseHostname = new URL(env.PUBLIC_BASE_URL ?? 'http://localhost:5173').hostname;

	let currentOrganization =
		organizations.find(({ payload }) => payload.default) ?? organizations[0];

	if (!env.PUBLIC_DONT_USE_SUBDOMAINS && url.hostname !== baseHostname) {
		currentOrganization =
			organizations.find(({ guid, payload }) => {
				const slug = payload.slug?.toLowerCase();

				return (
					url.hostname.startsWith(`${guid}.`) ||
					(slug ? url.hostname.startsWith(`${slug}.`) : false) ||
					url.hostname === payload.customDomain
				);
			}) ?? currentOrganization;
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
