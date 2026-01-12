import { error } from '@sveltejs/kit';
import { Roarr as log } from 'roarr';
import { isErrorLike, serializeError } from 'serialize-error';
import { unwrapFunctionStore, _ } from 'svelte-i18n';
import { z } from 'zod';
import { env } from '$env/dynamic/public';
import { filterVisible } from '$lib/authorization';
import { type KeycloakUser } from '$lib/models';
import type { OrganizationalUnitContainer, OrganizationContainer } from '$lib/models';
import {
	getManyOrganizationalUnitContainers,
	getManyOrganizationContainers,
	setUp
} from '$lib/server/db';
import { findUserById } from '$lib/server/keycloak';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	let currentOrganization;
	let currentOrganizationalUnit: OrganizationalUnitContainer | undefined;
	let user: KeycloakUser | undefined = undefined;

	const [allOrganizations, allOrganizationalUnits] = await Promise.all([
		locals.pool.connect(getManyOrganizationContainers({}, 'alpha')),
		locals.pool.connect(getManyOrganizationalUnitContainers({}))
	]);

	const organizations = filterVisible(allOrganizations, locals.user);
	const organizationalUnits = filterVisible(allOrganizationalUnits, locals.user);
	const defaultOrganizationGuid = allOrganizations.find(({ payload }) => payload.default)?.guid;

	// Don't use subdomains in dev mode if the env var is set
	if (env.PUBLIC_DONT_USE_SUBDOMAINS) {
		// Parse GUID from the URL path
		let guidFromURL = url.pathname.split('/')[1];

		// Check if the parsed part is a valid UUID
		if (z.uuid().safeParse(guidFromURL).success) {
			currentOrganization = organizations.find(({ guid }) => guid === guidFromURL);

			if (!currentOrganization) {
				currentOrganizationalUnit = organizationalUnits.find(({ guid }) => guid === guidFromURL);
				currentOrganization = organizations.find(
					({ guid }) => guid === currentOrganizationalUnit?.organization
				);
			}
		} else {
			currentOrganization = organizations.find(({ payload }) => payload.default);
			if (!currentOrganization) {
				currentOrganization = (await locals.pool.connect(
					setUp('knotdots.net', env.PUBLIC_KC_REALM ?? '')
				)) as OrganizationContainer;
			}
		}
	}
	// Production mode with subdomains
	else {
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

		// If we haven't found the organization yet, try to find the organizational unit by subdomain
		if (!currentOrganization) {
			currentOrganizationalUnit = organizationalUnits.find(({ guid }) =>
				url.hostname.startsWith(`${guid}.`)
			);

			currentOrganization = organizations.find(
				({ guid }) => guid === currentOrganizationalUnit?.organization
			);
		}
	}

	// Throw 404 if no organization is found
	if (!currentOrganization) {
		error(404, { message: unwrapFunctionStore(_)('error.not_found') });
	}

	if (url.searchParams.has('signup')) {
		try {
			const foundUser = await findUserById(url.searchParams.get('signup') as string);
			if (!foundUser.emailVerified) {
				user = foundUser;
			}
		} catch (error) {
			log.warn(isErrorLike(error) ? serializeError(error) : {}, String(error));
		}
	}

	return {
		currentOrganization,
		currentOrganizationalUnit,
		features: locals.features,
		organizations,
		organizationalUnits,
		defaultOrganizationGuid,
		session: await locals.auth(),
		user
	};
};
