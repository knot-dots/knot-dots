import { error } from '@sveltejs/kit';
import type { DatabaseConnection } from 'slonik';
import { unwrapFunctionStore, _ } from 'svelte-i18n';
import { env } from '$env/dynamic/public';
import defineAbilityFor, { filterVisible } from '$lib/authorization';
import {
	type AnyContainer,
	isOrganizationalUnitContainer,
	isTeamContainer,
	organizationalUnitType,
	type OrganizationContainer,
	type OrganizationalUnitContainer,
	type TeamContainer,
	predicates,
	payloadTypes
} from '$lib/models';
import { loadCategoryContext } from '$lib/server/categoryOptions';
import {
	getContainerByGuid,
	getManyContainers,
	getManyOrganizationalUnitContainers,
	getRelatedOrganizationContainersByPredicates,
	setUp
} from '$lib/server/db';

interface LoadApplicationContextParams {
	locals: App.Locals;
	params?: {
		guid?: string;
	};
	url: URL;
}

type TeamWithOrganizations = TeamContainer & { organizations: OrganizationContainer[] };

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

		const teamGuids = locals.user.teamMemberOf;

		const [organizations, organizationalUnits, teamContainers] = await Promise.all([
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
			) as Promise<OrganizationalUnitContainer[]>,
			teamGuids.length > 0
				? (filterVisibleAsync(
						connect(
							getManyContainers([], { guid: teamGuids, type: [payloadTypes.enum.team] }, 'alpha')
						)
					) as Promise<TeamContainer[]>)
				: Promise.resolve([] as TeamContainer[])
		]);

		const teams: TeamWithOrganizations[] = await Promise.all(
			teamContainers.map(async (team) => {
				const organizationsForTeam = await connect(
					getRelatedOrganizationContainersByPredicates(team.guid, [
						predicates.enum['is-part-of']
					])
				);

				return {
					...team,
					organizations: organizationsForTeam
				};
			})
		);

		let currentOrganizationalUnit: OrganizationalUnitContainer | undefined;
		let currentTeam: TeamWithOrganizations | undefined;
		const currentTeamOrganizations = () => currentTeam?.organizations ?? [];

		if (params?.guid) {
			try {
				const containerFromParams = await connect(getContainerByGuid(params.guid));
				if (
					isOrganizationalUnitContainer(containerFromParams) &&
					defineAbilityFor(locals.user).can('read', containerFromParams)
				) {
					currentOrganizationalUnit = containerFromParams;
				} else if (
					isTeamContainer(containerFromParams) &&
					defineAbilityFor(locals.user).can('read', containerFromParams)
				) {
					const organizationsForTeam = await connect(
						getRelatedOrganizationContainersByPredicates(containerFromParams.guid, [
							predicates.enum['is-part-of']
						])
					);

					currentTeam = {
						...containerFromParams,
						organizations: organizationsForTeam
					};
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
				if (!currentOrganization && currentTeamOrganizations().length > 0) {
					const organizations = currentTeamOrganizations();
					currentOrganization =
						organizations.find(({ payload }) => payload.default) ?? organizations[0];
				}
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
				currentOrganization = organizations.find(
					({ guid, payload }) =>
						url.hostname.startsWith(`${guid}.`) || url.hostname === payload.customDomain
				);
				if (!currentOrganization && currentTeamOrganizations().length > 0) {
					const organizations = currentTeamOrganizations();
					currentOrganization =
						organizations.find(({ payload }) => payload.default) ?? organizations[0];
				}
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
			currentTeam,
			defaultOrganizationGuid,
			features: locals.features,
			organizations,
			organizationalUnits,
			teams
		};
	});
}