import { error } from '@sveltejs/kit';
import { unwrapFunctionStore, _ } from 'svelte-i18n';
import { env } from '$env/dynamic/public';
import { getManyOrganizationalUnitContainers, getManyOrganizationContainers } from '$lib/server/db';
import type { LayoutServerLoad } from './$types';
import type { OrganizationalUnitContainer } from '$lib/models';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	let currentOrganization;
	let currentOrganizationalUnit: OrganizationalUnitContainer | undefined;

	const [organizations, organizationalUnits] = await Promise.all([
		locals.pool.connect(getManyOrganizationContainers('alpha')),
		locals.pool.connect(getManyOrganizationalUnitContainers({}, 'alpha'))
	]);

	if (url.hostname === new URL(env.PUBLIC_BASE_URL ?? '').hostname) {
		currentOrganization = organizations.find(({ payload }) => payload.default);
	} else {
		currentOrganization = organizations.find(({ payload }) =>
			url.hostname.startsWith(`${payload.slug}.`)
		);
	}

	if (!currentOrganization) {
		currentOrganizationalUnit = organizationalUnits.find(({ payload }) =>
			url.hostname.startsWith(`${payload.slug}.`)
		);

		currentOrganization = organizations.find(
			({ guid }) => guid === currentOrganizationalUnit?.organization
		);
	}

	if (!currentOrganization) {
		throw error(404, { message: unwrapFunctionStore(_)('error.not_found') });
	}

	return {
		currentOrganization,
		currentOrganizationalUnit,
		organizations,
		organizationalUnits
	};
};
