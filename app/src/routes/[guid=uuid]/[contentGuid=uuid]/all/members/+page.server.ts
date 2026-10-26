import { error } from '@sveltejs/kit';
import { NotFoundError } from 'slonik';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import defineAbilityFor from '$lib/authorization';
import { createFeatureDecisions } from '$lib/features';
import {
	isMeasureContainer,
	isProgramContainer,
	isSimpleMeasureContainer,
	predicates
} from '$lib/models';
import { getAllGrantsByContainers, getAllRelatedUsers, getContainerByGuid } from '$lib/server/db';
import { getMembers } from '$lib/server/keycloak';
import { loadMatrixSections } from '$lib/server/matrixSections';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, params }) => {
	const t = unwrapFunctionStore(_);

	try {
		const container = await locals.pool.connect(getContainerByGuid(params.contentGuid));

		const ability = defineAbilityFor(locals.user);

		if (!ability.can('read', container)) {
			error(404, { message: t('error.not_found') });
		}

		if (
			!isProgramContainer(container) &&
			!isMeasureContainer(container) &&
			!isSimpleMeasureContainer(container)
		) {
			error(404, { message: t('error.not_found') });
		}

		// Those managing the members and the members of the organization see the
		// whole matrix (view-only without the manage-users kind); anonymous
		// visitors and readers from other organizations get no roster of the
		// surrounding areas.
		const members = locals.user.isAuthenticated ? await getMembers(container.organization) : [];
		if (
			!locals.user.roles.includes('sysadmin') &&
			!ability.can('manage-users', container) &&
			!members.some(({ id }) => id === locals.user.guid)
		) {
			return {
				container,
				grants: [],
				title: t('members'),
				users: []
			};
		}

		// the sections exist for the permission matrix only; the member roles
		// govern while it is off
		const matrixEnabled = createFeatureDecisions(locals.features).usePermissionMatrix();
		const { grants, organization, sections, users } = await locals.pool.connect(
			async (connection) => ({
				grants: await getAllGrantsByContainers([container.guid])(connection),
				organization: await getContainerByGuid(container.organization)(connection),
				users: await getAllRelatedUsers(container.guid, [predicates.enum['is-member-of']])(
					connection
				),
				sections: matrixEnabled ? await loadMatrixSections(connection, container) : undefined
			})
		);

		return {
			container,
			grants,
			...(sections
				? { ...sections, mayManageOrganizationUsers: ability.can('manage-users', organization) }
				: {}),
			title: t('members'),
			users: users.map((u) => ({
				...u,
				email: members.find(({ id }) => id == u.guid)?.username ?? u.guid
			}))
		};
	} catch (e: unknown) {
		if (e instanceof NotFoundError) {
			error(404, { message: t('error.not_found') });
		} else {
			throw e;
		}
	}
}) satisfies PageServerLoad;
