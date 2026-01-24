import { error } from '@sveltejs/kit';
import { NotFoundError } from 'slonik';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import defineAbilityFor, { filterVisible } from '$lib/authorization';
import {
	type AnyPayload,
	type Container,
	findConnected,
	isContainerWithPayloadType,
	payloadTypes,
	predicates
} from '$lib/models';
import { getAllContainerRevisionsByGuid, getAllRelatedContainers } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ depends, locals, params, url }) => {
	depends('containers');

	const t = unwrapFunctionStore(_);

	try {
		const revisions = await locals.pool.connect(getAllContainerRevisionsByGuid(params.contentGuid));
		const container = revisions.at(-1) as Container<AnyPayload>;

		if (!defineAbilityFor(locals.user).can('read', container)) {
			error(404, { message: t('error.not_found') });
		}

		const isGoal = isContainerWithPayloadType(payloadTypes.enum.goal, container);
		const isMeasure = isContainerWithPayloadType(payloadTypes.enum.measure, container);

		if (!isGoal && !isMeasure) {
			error(404, { message: t('error.not_found') });
		}

		let containers = await locals.pool.connect(
			getAllRelatedContainers(
				[container.organization],
				container.guid,
				[predicates.enum['is-part-of'], predicates.enum['is-section-of']],
				{
					type: [
						payloadTypes.enum.effect,
						payloadTypes.enum.indicator,
						payloadTypes.enum.objective,
						payloadTypes.enum.resource_data,
						payloadTypes.enum.resource_data_collection
					]
				},
				url.searchParams.get('sort') ?? ''
			)
		);

		const selectedContainer = containers.find(
			({ guid }) => guid === url.searchParams.get('related-to')
		);

		if (
			selectedContainer &&
			(isContainerWithPayloadType(payloadTypes.enum.effect, selectedContainer) ||
				isContainerWithPayloadType(payloadTypes.enum.objective, selectedContainer))
		) {
			containers = [
				...findConnected(selectedContainer, containers, [predicates.enum['contributes-to']])
			];
		}

		return {
			container,
			containers: filterVisible(containers, locals.user),
			revisions: filterVisible(revisions, locals.user),
			title: `${container.payload.title} / ${t('workspace.iooi')}`
		};
	} catch (e: unknown) {
		if (e instanceof NotFoundError) {
			error(404, { message: t('error.not_found') });
		} else {
			throw e;
		}
	}
}) satisfies PageServerLoad;
