import { error } from '@sveltejs/kit';
import { unwrapFunctionStore, _ } from 'svelte-i18n';
import { env } from '$env/dynamic/public';
import defineAbilityFor, { filterVisible } from '$lib/authorization';
import {
	type AnyContainer,
	isOrganizationalUnitContainer,
	organizationalUnitType,
	type OrganizationContainer,
	type OrganizationalUnitContainer
} from '$lib/models';
import { loadCategoryContext } from '$lib/server/categoryOptions';
import {
	getContainerByGuid,
	getManyOrganizationalUnitContainers,
	getManyOrganizationContainers,
	setUp
} from '$lib/server/db';
import type { DatabaseConnection } from 'slonik';

interface LoadApplicationContextParams {
	locals: App.Locals;
	params?: {
		guid?: string;
	};
	url: URL;
}

export async function loadApplicationContext({
	locals,
	params,
	url
}: LoadApplicationContextParams) {
	return await locals.pool.connect(async (connection) => {
		const connect = <T>(fn: (connection: DatabaseConnection) => Promise<T>) => fn(connection);

		async function filterVisibleAsync<T extends AnyContainer>(promise: Promise<Array<T>>) {
			const containers = await promise;
			return filterVisible(containers, locals.user);
		}

		const [organizations, organizationalUnits] = await Promise.all([
			filterVisibleAsync(connect(getManyOrganizationContainers({}, 'alpha'))),
			filterVisibleAsync(
				connect(
					getManyOrganizationalUnitContainers({
						exclude: {
							organizationalUnitType: [
								organizationalUnitType.enum['organizational_unit_type.administrative_area']
							]
						}
					})
				)
			)
		]);

		let currentOrganizationalUnit: OrganizationalUnitContainer | undefined;

		if (params?.guid) {
			try {
				const containerFromParams = await connect(getContainerByGuid(params.guid));
				if (
					isOrganizationalUnitContainer(containerFromParams) &&
					defineAbilityFor(locals.user).can('read', containerFromParams)
				) {
					currentOrganizationalUnit = containerFromParams;
				}
			} catch {
				// Do nothing.
			}
		}

		let currentOrganization: OrganizationContainer | undefined;

		if (env.PUBLIC_DONT_USE_SUBDOMAINS) {
			if (currentOrganizationalUnit) {
				currentOrganization = organizations.find(
					({ guid }) => guid === currentOrganizationalUnit.organization
				);
			} else if (params?.guid) {
				currentOrganization = organizations.find(({ guid }) => guid === params.guid);
			} else {
				currentOrganization = organizations.find(({ payload }) => payload.default);
				if (!currentOrganization) {
					currentOrganization = (await connect(
						setUp('knotdots.net', env.PUBLIC_KC_REALM ?? '')
					)) as OrganizationContainer;
				}
			}
		} else {
			if (url.hostname === new URL(env.PUBLIC_BASE_URL ?? '').hostname) {
				currentOrganization = organizations.find(({ payload }) => payload.default);
				if (!currentOrganization) {
					currentOrganization = (await connect(
						setUp('knotdots.net', env.PUBLIC_KC_REALM ?? '')
					)) as OrganizationContainer;
				}
			} else {
				currentOrganization = organizations.find(({ guid }) => url.hostname.startsWith(`${guid}.`));
			}
		}

		if (!currentOrganization) {
			error(404, { message: unwrapFunctionStore(_)('error.not_found') });
		}

		const defaultOrganizationGuid =
			organizations.find(({ payload }) => payload.default)?.guid ?? currentOrganization.guid;

		const categoryContext = await loadCategoryContext({
			connect,
			scope: [currentOrganization.guid, defaultOrganizationGuid],
			user: locals.user
		});
		return {
			categoryContext,
			currentOrganization,
			currentOrganizationalUnit,
			defaultOrganizationGuid,
			features: locals.features,
			organizations,
			organizationalUnits
		};
	});
}
