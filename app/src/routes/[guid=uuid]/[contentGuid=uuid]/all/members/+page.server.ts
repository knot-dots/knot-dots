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

		// The inherited section discloses the governing matrix and its members;
		// that view belongs to those who may manage the container's users.
		if (!ability.can('manage-users', container)) {
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

		// The matrix governing this container names itself: the read-time
		// enrichment resolved the source — a decoupled manager, the
		// organizational unit or the organization. A decoupled container is its
		// own source; the inherited section then shows what would apply again
		// after re-inheriting, so it falls back to the nearest manager.
		const inherits = !container.own_matrix;
		const sourceGuid = inherits
			? (container.user_grant?.source ?? container.organizational_unit ?? container.organization)
			: grantSourceOf(container);
		const scopeGuids = [
			...new Set([
				container.organization,
				...(container.organizational_unit ? [container.organizational_unit] : [])
			])
		].filter((guid) => guid !== container.guid);
		const matrixGuids = [...new Set([sourceGuid, ...scopeGuids])];

		const [members, grants, scope, matrixGrants, matrixUsers] = await Promise.all([
			getMembers(container.organization),
			locals.pool.connect(getAllGrantsByContainers([container.guid])),
			locals.pool.connect(getContainerByGuid(sourceGuid)),
			locals.pool.connect(getAllGrantsByContainers(matrixGuids)),
			locals.pool.connect(
				getAllRelatedUsersByContainers(matrixGuids, [
					predicates.enum['is-admin-of'],
					predicates.enum['is-collaborator-of'],
					predicates.enum['is-head-of'],
					predicates.enum['is-member-of']
				])
			)
		]);

		// Materialize the effective sets as rows on the governing matrix: the
		// kinds the source grants each subject, while administrators of the
		// surrounding areas keep every kind regardless of the source — the same
		// overlay the enforcement applies.
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
		const inheritedGrants = matrixUsers.flatMap(({ guid: subject }) => {
			const set = isScopeAdmin(subject)
				? administratorSet
				: grantSetForSubjectOn(matrixGrants, sourceGuid, subject);
			return [
				...set.self.map((kind) => ({ kind, object: scope.guid, subject, target: 'self' as const })),
				...set.subordinates.map((kind) => ({
					kind,
					object: scope.guid,
					subject,
					target: 'subordinates' as const
				}))
			];
		});
		const inheritedUsers = matrixUsers.filter(({ guid }) =>
			inheritedGrants.some(({ subject }) => subject === guid)
		);

		return {
			container,
			grants,
			inheritedGrants,
			inheritedUsers,
			scope,
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
