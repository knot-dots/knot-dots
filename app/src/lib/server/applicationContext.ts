import { error } from '@sveltejs/kit';
import type { DatabaseConnection } from 'slonik';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { env } from '$env/dynamic/public';
import defineAbilityFor, { filterVisible } from '$lib/authorization';
import {
	type AnyPayload,
	type Container,
	isOrganizationalUnitContainer,
	type OrganizationalUnitPayload,
	organizationalUnitType,
	type OrganizationPayload,
	payloadTypes
} from '$lib/models';
import { loadCategoryContext } from '$lib/server/categoryOptions';
import {
	getContainerByGuid,
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

		async function filterVisibleAsync<T extends Container<AnyPayload>>(promise: Promise<Array<T>>) {
			const containers = await promise;
			return filterVisible(containers, locals.user);
		}

		const [organizations, containerFromParams] = await Promise.all([
			filterVisibleAsync(
				connect(getManyContainers([], { type: [payloadTypes.enum.organization] }, 'alpha'))
			) as Promise<Container<OrganizationPayload>[]>,
			params?.guid ? connect(getContainerByGuid(params.guid)).catch(() => undefined) : undefined
		]);

		let currentOrganizationalUnit: Container<OrganizationalUnitPayload> | undefined;

		if (
			containerFromParams &&
			isOrganizationalUnitContainer(containerFromParams) &&
			defineAbilityFor(locals.user).can('read', containerFromParams)
		) {
			currentOrganizationalUnit = containerFromParams;
		}

		let currentOrganization: Container<OrganizationPayload> | undefined;

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
					)) as Container<OrganizationPayload>;
				}
			}
		} else {
			if (url.hostname === new URL(env.PUBLIC_BASE_URL ?? '').hostname) {
				currentOrganization = organizations.find(({ payload }) => payload.default);
				if (!currentOrganization) {
					currentOrganization = (await connect(
						setUp('knotdots.net', env.PUBLIC_KC_REALM ?? '')
					)) as Container<OrganizationPayload>;
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

		const [categoryContext, organizationalUnits] = await Promise.all([
			loadCategoryContext({
				connect,
				scope: [currentOrganization.guid, defaultOrganizationGuid],
				user: locals.user
			}),
			filterVisibleAsync(
				connect(
					getManyOrganizationalUnitContainers({
						include: {
							guid: locals.user.memberOf,
							organization: currentOrganization.guid
						},
						exclude: {
							organizationalUnitType: [
								organizationalUnitType.enum['organizational_unit_type.administrative_area']
							]
						}
					})
				)
			)
		]);
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
