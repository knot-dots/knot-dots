import { error } from '@sveltejs/kit';
import { unwrapFunctionStore, _ } from 'svelte-i18n';
import { env } from '$env/dynamic/public';
import {
	getManyOrganizationalUnitContainers,
	getManyOrganizationContainers,
	setUp
} from '$lib/server/db';
import type { LayoutServerLoad } from './$types';
import type { OrganizationalUnitContainer, OrganizationContainer } from '$lib/models';

export const load: LayoutServerLoad = async ({ fetch, locals, url }) => {
	let currentOrganization;
	let currentOrganizationalUnit: OrganizationalUnitContainer | undefined;

	const [organizations, organizationalUnits] = await Promise.all([
		locals.pool.connect(getManyOrganizationContainers({}, 'alpha')),
		locals.pool.connect(getManyOrganizationalUnitContainers({}))
	]);

	if (url.hostname === new URL(env.PUBLIC_BASE_URL ?? '').hostname) {
		currentOrganization = organizations.find(({ payload }) => payload.default);
		if (!currentOrganization) {
			currentOrganization = (await locals.pool.connect(
				setUp('knotdots.net', env.PUBLIC_KC_REALM ?? '')
			)) as OrganizationContainer;
		}
	} else {
		currentOrganization = organizations.find(({ guid }) => url.hostname.startsWith(`${guid}.`));
	}

	if (!currentOrganization) {
		currentOrganizationalUnit = organizationalUnits.find(({ guid }) =>
			url.hostname.startsWith(`${guid}.`)
		);

		currentOrganization = organizations.find(
			({ guid }) => guid === currentOrganizationalUnit?.organization
		);
	}

	if (!currentOrganization) {
		throw error(404, { message: unwrapFunctionStore(_)('error.not_found') });
	}

	const random = await fetch('/random');

	return {
		currentOrganization,
		currentOrganizationalUnit,
		organizations,
		organizationalUnits,
		random: await random.json()
	};
};
