import { error } from '@sveltejs/kit';
import { NotFoundError } from 'slonik';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import defineAbilityFor from '$lib/authorization';
import {
	grantSetForRole,
	grantSetForSubjectOn,
	grantSourceOf,
	isMeasureContainer,
	isProgramContainer,
	isSimpleMeasureContainer,
	memberRoles,
	predicates
} from '$lib/models';
import {
	getAllGrantsByContainers,
	getAllRelatedUsers,
	getAllRelatedUsersByContainers,
	getContainerByGuid
} from '$lib/server/db';
import { getMembers } from '$lib/server/keycloak';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, params }) => {
	const t = unwrapFunctionStore(_);

	try {
		const [container, users] = await Promise.all([
			locals.pool.connect(getContainerByGuid(params.contentGuid)),
			locals.pool.connect(getAllRelatedUsers(params.contentGuid, [predicates.enum['is-member-of']]))
		]);

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

		// Signed-in readers see the whole matrix (view-only without the
		// manage-users kind); anonymous visitors of public containers get no
		// roster of the surrounding areas.
		if (!locals.user.isAuthenticated) {
			const [members, grants] = await Promise.all([
				getMembers(container.organization),
				locals.pool.connect(getAllGrantsByContainers([container.guid]))
			]);
			return {
				container,
				grants,
				title: t('members'),
				users: users.map((u) => ({
					...u,
					email: members.find(({ id }) => id == u.guid)?.username ?? u.guid
				}))
			};
		}

		// The matrices governing this container name themselves: the read-time
		// enrichment resolved the sources — decoupled managers, the
		// organizational unit or the organization. A decoupled container is its
		// own and only source; the inherited sections then show what would apply
		// again after re-inheriting, so they fall back to the nearest manager.
		const inherits = !container.own_matrix;
		const sourceGuids = inherits
			? (container.user_grant?.sources ?? [container.organizational_unit ?? container.organization])
			: [grantSourceOf(container)];
		const scopeGuids = [
			...new Set([
				container.organization,
				...(container.organizational_unit ? [container.organizational_unit] : [])
			])
		].filter((guid) => guid !== container.guid);
		const matrixGuids = [...new Set([...sourceGuids, ...scopeGuids])];

		const [members, grants, sourceContainers, matrixGrants, matrixUsers, organization] =
			await Promise.all([
				getMembers(container.organization),
				locals.pool.connect(getAllGrantsByContainers([container.guid])),
				Promise.all(
					sourceGuids.map((sourceGuid) => locals.pool.connect(getContainerByGuid(sourceGuid)))
				),
				locals.pool.connect(getAllGrantsByContainers(matrixGuids)),
				locals.pool.connect(
					getAllRelatedUsersByContainers(matrixGuids, [
						predicates.enum['is-admin-of'],
						predicates.enum['is-collaborator-of'],
						predicates.enum['is-head-of'],
						predicates.enum['is-member-of']
					])
				),
				locals.pool.connect(getContainerByGuid(container.organization))
			]);

		// Administrators of the surrounding areas keep every kind regardless of
		// the sources — the same hold the enforcement applies. They form a block
		// of their own, so the inherited sections leave them out.
		const administratorSet = grantSetForRole(memberRoles.enum.administrator);
		const isScopeAdmin = (subject: string) =>
			scopeGuids.some((area) =>
				administratorSet.self.every((kind) =>
					matrixGrants.some(
						(grant) =>
							grant.object === area &&
							grant.subject === subject &&
							grant.target === 'self' &&
							grant.kind === kind
					)
				)
			);
		const admins = matrixUsers.filter(({ guid }) => isScopeAdmin(guid));

		// One section per source, in the order of the computed sources, with the
		// effective sets materialized as rows on that source's matrix.
		const inheritedSections = sourceContainers.map((scope) => {
			const sectionGrants = matrixUsers
				.filter(({ guid }) => !isScopeAdmin(guid))
				.flatMap(({ guid: subject }) => {
					const set = grantSetForSubjectOn(matrixGrants, scope.guid, subject);
					return [
						...set.self.map((kind) => ({
							kind,
							object: scope.guid,
							subject,
							target: 'self' as const
						})),
						...set.subordinates.map((kind) => ({
							kind,
							object: scope.guid,
							subject,
							target: 'subordinates' as const
						}))
					];
				});
			return {
				scope,
				grants: sectionGrants,
				users: matrixUsers.filter(({ guid }) =>
					sectionGrants.some(({ subject }) => subject === guid)
				)
			};
		});

		return {
			admins,
			container,
			grants,
			inheritedSections,
			mayManageOrganizationUsers: ability.can('manage-users', organization),
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
