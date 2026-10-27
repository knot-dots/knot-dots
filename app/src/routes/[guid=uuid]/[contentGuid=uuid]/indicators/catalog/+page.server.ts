import { error } from '@sveltejs/kit';
import { NotFoundError } from 'slonik';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import defineAbilityFor, { filterVisible } from '$lib/authorization';
import {
	type AnyPayload,
	type Container,
	isActualDataContainer,
	isBinaryIndicatorContainer,
	isIndicatorContainer,
	isProgramContainer,
	payloadTypes
} from '$lib/models';
import {
	getAllContainerRevisionsByGuid,
	getAllContainersRelatedToProgram,
	getManyContainers
} from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ depends, locals, params, parent }) => {
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

		const containers = await locals.pool.connect(
			getAllContainersRelatedToProgram(container.guid, {})
		);

		// Charts of indicators need the actual data of the current organization or unit,
		// as in the indicator catalog of the organization
		const { currentOrganization, currentOrganizationalUnit } = await parent();
		const indicatorGuids = containers
			.filter((c) => isIndicatorContainer(c) || isBinaryIndicatorContainer(c))
			.map(({ guid }) => guid);
		const actualData =
			indicatorGuids.length > 0
				? await locals.pool.connect(
						getManyContainers(
							[currentOrganization.guid],
							{
								indicators: indicatorGuids,
								organizationalUnits: currentOrganizationalUnit
									? [currentOrganizationalUnit.guid]
									: null,
								type: [payloadTypes.enum.actual_data]
							},
							''
						)
					)
				: [];

		return {
			container,
			containers: filterVisible(
				[...containers, ...actualData.filter(isActualDataContainer)],
				locals.user
			),
			revisions: filterVisible(revisions, locals.user),
			title: t('workspace.indicators.title')
		};
	} catch (e: unknown) {
		if (e instanceof NotFoundError) {
			error(404, { message: t('error.not_found') });
		} else {
			throw e;
		}
	}
}) satisfies PageServerLoad;
