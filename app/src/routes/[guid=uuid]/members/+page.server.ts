import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import defineAbilityFor from '$lib/authorization';
import { createFeatureDecisions } from '$lib/features';
import { isOrganizationalUnitContainer, isOrganizationContainer, predicates } from '$lib/models';
import { getAllGrantsByContainers, getAllRelatedUsers, getContainerByGuid } from '$lib/server/db';
import { getMembers } from '$lib/server/keycloak';
import { loadMatrixSections, loadTeams } from '$lib/server/matrixSections';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, parent }) => {
	const { currentOrganization, currentOrganizationalUnit } = await parent();
	const guid = currentOrganizationalUnit?.guid ?? currentOrganization.guid;

	const container = await locals.pool.connect(getContainerByGuid(guid));

	if (!isOrganizationContainer(container) && !isOrganizationalUnitContainer(container)) {
		error(404, unwrapFunctionStore(_)('error.not_found'));
	}

	if (defineAbilityFor(locals.user).cannot('manage-users', container)) {
		error(404, unwrapFunctionStore(_)('error.not_found'));
	}

	// an organizational unit inherits its matrices from the computed sources (a
	// decoupled parent unit or the organization), shown with the same sections
	// and toggle as measures and programs
	const [members, { grants, sections, teams, users }] = await Promise.all([
		getMembers(container.organization),
		locals.pool.connect(async (connection) => {
			const matrixEnabled = createFeatureDecisions(locals.features).usePermissionMatrix();
			const sections =
				isOrganizationalUnitContainer(container) && matrixEnabled
					? await loadMatrixSections(connection, container)
					: undefined;
			return {
				grants: await getAllGrantsByContainers([guid])(connection),
				users: await getAllRelatedUsers(guid, [predicates.enum['is-member-of']])(connection),
				sections,
				teams:
					sections?.teams ??
					(matrixEnabled ? await loadTeams(connection, container.organization) : [])
			};
		})
	]);

	return {
		container,
		grants,
		teams,
		...(sections
			? {
					...sections,
					mayManageOrganizationUsers: defineAbilityFor(locals.user).can(
						'manage-users',
						currentOrganization
					)
				}
			: {}),
		title: unwrapFunctionStore(_)('members'),
		users: users.map((u) => ({
			...u,
			email: members.find(({ id }) => id == u.guid)?.username ?? u.guid
		}))
	};
}) satisfies PageServerLoad;
