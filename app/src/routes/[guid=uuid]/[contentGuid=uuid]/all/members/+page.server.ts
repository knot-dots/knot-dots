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
import { getAllGrantsByContainers, getAllRelatedUsers, getContainerByGuid } from '$lib/server/db';
import { getMembers } from '$lib/server/keycloak';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, params }) => {
	const t = unwrapFunctionStore(_);

	try {
		const [container, users, grants] = await Promise.all([
			locals.pool.connect(getContainerByGuid(params.contentGuid)),
			locals.pool.connect(
				getAllRelatedUsers(params.contentGuid, [predicates.enum['is-member-of']])
			),
			locals.pool.connect(getAllGrantsByContainers([params.contentGuid]))
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

		const members = await getMembers(container.organization);

		return {
			container,
			grants,
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
