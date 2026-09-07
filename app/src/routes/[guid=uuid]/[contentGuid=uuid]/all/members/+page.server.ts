import { error } from '@sveltejs/kit';
import { NotFoundError } from 'slonik';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import defineAbilityFor from '$lib/authorization';
import {
	isMeasureContainer,
	isProgramContainer,
	isSimpleMeasureContainer,
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

		if (!defineAbilityFor(locals.user).can('read', container)) {
			error(404, { message: t('error.not_found') });
		}

		if (
			!isProgramContainer(container) &&
			!isMeasureContainer(container) &&
			!isSimpleMeasureContainer(container)
		) {
			error(404, { message: t('error.not_found') });
		}

		const scopeGuid = container.organizational_unit ?? container.organization;
		const [members, grants, scope, inheritedGrants, inheritedUsers] = await Promise.all([
			getMembers(container.organization),
			locals.pool.connect(getAllGrantsByContainers([container.guid])),
			locals.pool.connect(getContainerByGuid(scopeGuid)),
			locals.pool.connect(getAllGrantsByContainers([scopeGuid])),
			locals.pool.connect(
				getAllRelatedUsersByContainers(
					[scopeGuid],
					[
						predicates.enum['is-admin-of'],
						predicates.enum['is-collaborator-of'],
						predicates.enum['is-head-of'],
						predicates.enum['is-member-of']
					]
				)
			)
		]);

		return {
			container,
			grants,
			inheritedGrants,
			inheritedUsers,
			scope,
			title: `${container.payload.title} / ${t('members')}`,
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
