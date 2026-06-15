import { error } from '@sveltejs/kit';
import type { DatabaseConnection } from 'slonik';
import { unwrapFunctionStore, _ } from 'svelte-i18n';
import { env } from '$env/dynamic/public';
import defineAbilityFor, { filterVisible } from '$lib/authorization';
import {
	type AnyContainer,
	isOrganizationalUnitContainer,
	isOrganizationContainer,
	organizationalUnitType,
	type OrganizationContainer,
	type OrganizationalUnitContainer,
	payloadTypes
} from '$lib/models';
import { loadCategoryContext } from '$lib/server/categoryOptions';
import {
	getContainerByGuid,
	getContainerByGuidOrSlug,
	getManyContainers,
	getManyOrganizationalUnitContainers,
	setUp
} from '$lib/server/db';

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
			filterVisibleAsync(
				connect(getManyContainers([], { type: [payloadTypes.enum.organization] }, 'alpha'))
			) as Promise<OrganizationContainer[]>,
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
		let currentOrganizationFromParams: OrganizationContainer | undefined;

		if (params?.guid) {
			const guidOrSlug = params.guid.toLowerCase();
			currentOrganizationalUnit = organizationalUnits.find(
				({ guid, payload }) => guid === params.guid || payload.slug === guidOrSlug
			);
		}

		if (params?.guid && !currentOrganizationalUnit) {
			try {
				const containerFromParams = await connect(getContainerByGuidOrSlug(params.guid));
				if (
					isOrganizationalUnitContainer(containerFromParams) &&
					defineAbilityFor(locals.user).can('read', containerFromParams)
				) {
					currentOrganizationalUnit = containerFromParams;
				} else if (
					isOrganizationContainer(containerFromParams) &&
					defineAbilityFor(locals.user).can('read', containerFromParams)
				) {
					currentOrganizationFromParams = containerFromParams;
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

				if (!currentOrganization) {
					try {
						const organizationFromOrgUnit = await connect(
							getContainerByGuid(currentOrganizationalUnit.organization)
						);

						if (isOrganizationContainer(organizationFromOrgUnit)) {
							currentOrganization = organizationFromOrgUnit;
						}
					} catch {
						// Keep fallback behavior and let standard not-found handling decide.
					}
				}
			} else if (currentOrganizationFromParams) {
				currentOrganization = currentOrganizationFromParams;
			} else if (params?.guid) {
				const slug = params.guid.toLowerCase();
				currentOrganization = organizations.find(
					({ guid, payload }) => guid === params.guid || payload.slug === slug
				);
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
				currentOrganization = organizations.find(({ guid, payload }) => {
					const slug = payload.slug?.toLowerCase();

					return (
						url.hostname.startsWith(`${guid}.`) ||
						(slug ? url.hostname.startsWith(`${slug}.`) : false) ||
						url.hostname === payload.customDomain
					);
				});
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
