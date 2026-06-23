/**
 * Minimal test endpoint for the new container_permission system.
 * Visit GET /_internal/permissions-test to see which container GUIDs
 * the current user can read via the new grant-based system.
 *
 * Remove or gate behind sysadmin once the system is production-ready.
 */
import { json } from '@sveltejs/kit';
import type { ContainerPermission } from '$lib/models';
import { PUBLIC_SUBJECT, isTeamContainer } from '$lib/models';
import { effectivePermissions, getContainerPermissions, visibleContainerGuids } from '$lib/server/db';
import { getRelatedOrganizationContainersByPredicates, getContainerByGuid } from '$lib/server/db';
import { predicates } from '$lib/models';

export const GET = async ({ locals, url }: { locals: App.Locals; url: URL }) => {
	const user = locals.user;

	const subjects = user.isAuthenticated
		? [user.guid, ...user.teamMemberOf, PUBLIC_SUBJECT]
		: [PUBLIC_SUBJECT];

	const guids = await locals.pool.connect(visibleContainerGuids(subjects));

	// Optionally inspect effective permissions for a specific container
	const inspectGuid = url.searchParams.get('guid');
	let effective: string[] = [];
	let directGrants: readonly ContainerPermission[] = [];
	let teamOrganizations: Array<{ guid: string; name: string }> = [];
	if (inspectGuid) {
		const inspectedContainer = await locals.pool.connect(getContainerByGuid(inspectGuid));
		[effective, directGrants] = await Promise.all([
			locals.pool.connect(effectivePermissions(inspectGuid, subjects)),
			locals.pool.connect(getContainerPermissions(inspectGuid))
		]);
		if (isTeamContainer(inspectedContainer)) {
			const organizations = await locals.pool.connect(
				getRelatedOrganizationContainersByPredicates(inspectGuid, [
					predicates.enum['is-part-of']
				])
			);
			teamOrganizations = organizations.map(({ guid, payload }) => ({
				guid,
				name: payload.name
			}));
		}
	}

	return json({
		user: {
			guid: user.guid,
			isAuthenticated: user.isAuthenticated,
			teamMemberOf: user.teamMemberOf
		},
		subjects,
		visibleContainerCount: guids.length,
		visibleContainerGuids: guids,
		teamOrganizations,
		...(inspectGuid
			? {
				inspect: {
					guid: inspectGuid,
					effectivePredicates: effective,
					directGrants
				}
			}
			: {})
	});
};
