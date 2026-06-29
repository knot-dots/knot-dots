import { error, type Cookies } from '@sveltejs/kit';
import type { DatabaseConnection } from 'slonik';
import { unwrapFunctionStore, _ } from 'svelte-i18n';
import { env } from '$env/dynamic/public';
import defineAbilityFor, { filterVisible } from '$lib/authorization';
import {
	type AnyContainer,
	organizationalUnitType,
	type OrganizationContainer,
	type OrganizationalUnitContainer,
	payloadTypes
} from '$lib/models';
import { loadCategoryContext } from '$lib/server/categoryOptions';
import { getManyContainers, getManyOrganizationalUnitContainers, setUp } from '$lib/server/db';

interface LoadApplicationContextParams {
	locals: App.Locals;
	cookies?: Cookies;
	params?: {
		guid?: string;
	};
	url: URL;
}

export async function loadApplicationContext({
	locals,
	cookies,
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

		const rememberedOrganizationGuid = env.PUBLIC_DONT_USE_SUBDOMAINS
			? cookies?.get('current-organization-guid')
			: undefined;
		const rememberedOrganization =
			rememberedOrganizationGuid !== undefined
				? organizations.find(({ guid }) => guid === rememberedOrganizationGuid)
				: undefined;

		let currentOrganizationalUnit: OrganizationalUnitContainer | undefined;
		let currentOrganizationFromParams: OrganizationContainer | undefined;

		if (params?.guid) {
			const guidOrSlug = params.guid.toLowerCase();
			currentOrganizationFromParams = organizations.find(
				({ guid, payload }) => guid === params.guid || payload.slug === guidOrSlug
			);
		}

		let currentOrganization: OrganizationContainer | undefined;

		if (env.PUBLIC_DONT_USE_SUBDOMAINS) {
			if (currentOrganizationFromParams) {
				currentOrganization = currentOrganizationFromParams;
			} else if (rememberedOrganization) {
				currentOrganization = rememberedOrganization;
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

		if (params?.guid) {
			const guidOrSlug = params.guid.toLowerCase();
			currentOrganizationalUnit = organizationalUnits.find(
				({ guid, organization, payload }) =>
					organization === currentOrganization.guid &&
					(guid === params.guid || payload.slug === guidOrSlug)
			);
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
