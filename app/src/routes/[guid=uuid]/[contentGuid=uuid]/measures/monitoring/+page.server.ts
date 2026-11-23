import { error } from '@sveltejs/kit';
import { NotFoundError } from 'slonik';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import defineAbilityFor, { filterVisible } from '$lib/authorization';
import {
	type AnyPayload,
	type Container,
	isProgramContainer,
	payloadTypes,
	predicates
} from '$lib/models';
import {
	getAllContainerRevisionsByGuid,
	getAllContainersRelatedToProgram,
	getAllRelatedContainers
} from '$lib/server/db';
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

		if (!isProgramContainer(container)) {
			error(404, { message: t('error.not_found') });
		}

		const containers = url.searchParams.has('related-to')
			? await locals.pool.connect(
					getAllRelatedContainers(
						[container.organization],
						url.searchParams.get('related-to') as string,
						[predicates.enum['is-part-of']],
						{
							type: [
								payloadTypes.enum.effect,
								payloadTypes.enum.goal,
								payloadTypes.enum.indicator,
								payloadTypes.enum.measure,
								payloadTypes.enum.simple_measure,
								payloadTypes.enum.task
							]
						},
						url.searchParams.get('sort') ?? ''
					)
				)
			: await locals.pool.connect(
					getAllContainersRelatedToProgram(
						container.guid,
						{
							terms: url.searchParams.get('terms') ?? '',
							type: [
								payloadTypes.enum.effect,
								payloadTypes.enum.goal,
								payloadTypes.enum.indicator,
								payloadTypes.enum.measure,
								payloadTypes.enum.simple_measure,
								payloadTypes.enum.task
							]
						},
						url.searchParams.get('sort') ?? ''
					)
				);

		return {
			container,
			containers: filterVisible(containers, locals.user),
			revisions: filterVisible(revisions, locals.user),
			title: t('workspace.monitoring.title')
		};
	} catch (e: unknown) {
		if (e instanceof NotFoundError) {
			error(404, { message: t('error.not_found') });
		} else {
			throw e;
		}
	}
}) satisfies PageServerLoad;
