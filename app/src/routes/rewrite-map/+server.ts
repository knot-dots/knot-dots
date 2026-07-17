import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';
import { getManyOrganizationContainers, getManyOrganizationalUnitContainers } from '$lib/server/db';
import type { RequestHandler } from './$types';

type RewriteMap = Record<string, Record<string, string>>;

const baseURL = new URL(env.PUBLIC_BASE_URL);

export const GET: RequestHandler = async ({ locals }) => {
	const [organizations, organizationalUnits] = await Promise.all([
		locals.pool.connect(getManyOrganizationContainers({}, 'alpha')),
		locals.pool.connect(getManyOrganizationalUnitContainers({}))
	]);

	const rewriteMap: RewriteMap = {};

	for (const organization of organizations) {
		const hostname = organization.payload.default
			? baseURL.hostname
			: `${organization.guid}.${baseURL.hostname}`;

		rewriteMap[hostname] = {
			...(organization.payload.slug
				? { [organization.payload.slug]: organization.guid }
				: undefined),
			...Object.fromEntries(
				organizationalUnits
					.filter((ou) => ou.organization == organization.guid && ou.payload.slug)
					.map(({ guid, payload }) => [payload.slug as string, guid])
			)
		};

		if (organization.payload.slug && !organization.payload.default) {
			rewriteMap[`${organization.payload.slug}.${baseURL.hostname}`] = rewriteMap[hostname];
		}

		if (organization.payload.customDomain) {
			rewriteMap[organization.payload.customDomain] = rewriteMap[hostname];
		}
	}

	return json(rewriteMap);
};
