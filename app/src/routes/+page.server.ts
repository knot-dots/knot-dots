import { filterVisible } from '$lib/authorization';
import {
	type AnyContainer,
	type Container,
	audience,
	filterOrganizationalUnits,
	predicates,
	payloadTypes
} from '$lib/models';
import {
	getAllContainersWithIndicatorContributions,
	getAllRelatedContainers,
	getAllRelatedContainersByStrategyType,
	getAllRelatedOrganizationalUnitContainers,
	getManyContainers
} from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, url, parent }) => {
	let containersPromise;
	let containersWithIndicatorContributionsPromise;
	const { currentOrganization, currentOrganizationalUnit } = await parent();

	if (url.searchParams.has('related-to')) {
		[containersPromise, containersWithIndicatorContributionsPromise] = [
			locals.pool.connect(
				getAllRelatedContainers(
					currentOrganization.payload.default ? [] : [currentOrganization.guid],
					url.searchParams.get('related-to') as string,
					url.searchParams.getAll('relationType').length == 0
						? [
								predicates.enum['contributes-to'],
								predicates.enum['is-consistent-with'],
								predicates.enum['is-equivalent-to'],
								predicates.enum['is-inconsistent-with'],
								predicates.enum['is-part-of']
							]
						: url.searchParams.getAll('relationType'),
					{
						type: [
							payloadTypes.enum.effect,
							payloadTypes.enum.indicator,
							payloadTypes.enum.measure,
							payloadTypes.enum.model,
							payloadTypes.enum.operational_goal,
							payloadTypes.enum.simple_measure,
							payloadTypes.enum.strategic_goal,
							payloadTypes.enum.strategy,
							payloadTypes.enum.vision
						]
					},
					url.searchParams.get('sort') ?? ''
				)
			),
			locals.pool.connect(
				getAllContainersWithIndicatorContributions(
					currentOrganization.payload.default ? [] : [currentOrganization.guid]
				)
			)
		];
	} else if (url.searchParams.has('strategyType')) {
		[containersPromise, containersWithIndicatorContributionsPromise] = [
			locals.pool.connect(
				getAllRelatedContainersByStrategyType(
					currentOrganization.payload.default ? [] : [currentOrganization.guid],
					url.searchParams.getAll('strategyType'),
					{
						audience: url.searchParams.has('audienceChanged')
							? url.searchParams.getAll('audience')
							: [audience.enum['audience.public'], audience.enum['audience.organization']],
						categories: url.searchParams.getAll('category'),
						topics: url.searchParams.getAll('topic'),
						terms: url.searchParams.get('terms') ?? '',
						type: [
							payloadTypes.enum.effect,
							payloadTypes.enum.indicator,
							payloadTypes.enum.measure,
							payloadTypes.enum.model,
							payloadTypes.enum.operational_goal,
							payloadTypes.enum.simple_measure,
							payloadTypes.enum.strategic_goal,
							payloadTypes.enum.strategy,
							payloadTypes.enum.vision
						]
					},
					url.searchParams.get('sort') ?? ''
				)
			),
			locals.pool.connect(
				getAllContainersWithIndicatorContributions(
					currentOrganization.payload.default ? [] : [currentOrganization.guid]
				)
			)
		];
	} else {
		[containersPromise, containersWithIndicatorContributionsPromise] = [
			locals.pool.connect(
				getManyContainers(
					currentOrganization.payload.default ? [] : [currentOrganization.guid],
					{
						audience: url.searchParams.has('audienceChanged')
							? url.searchParams.getAll('audience')
							: [audience.enum['audience.public'], audience.enum['audience.organization']],
						categories: url.searchParams.getAll('category'),
						topics: url.searchParams.getAll('topic'),
						strategyTypes: url.searchParams.getAll('strategyType'),
						terms: url.searchParams.get('terms') ?? '',
						type: [
							payloadTypes.enum.effect,
							payloadTypes.enum.indicator,
							payloadTypes.enum.measure,
							payloadTypes.enum.model,
							payloadTypes.enum.operational_goal,
							payloadTypes.enum.resolution,
							payloadTypes.enum.simple_measure,
							payloadTypes.enum.strategic_goal,
							payloadTypes.enum.strategy,
							payloadTypes.enum.vision
						]
					},
					url.searchParams.get('sort') ?? ''
				)
			),
			locals.pool.connect(
				getAllContainersWithIndicatorContributions(
					currentOrganization.payload.default ? [] : [currentOrganization.guid]
				)
			)
		];
	}

	async function filterVisibleAsync<T extends AnyContainer>(promise: Promise<Array<T>>) {
		const containers = await promise;
		return filterVisible(containers, locals.user);
	}

	async function filterOrganizationalUnitsAsync<T extends Container>(promise: Promise<Array<T>>) {
		let subordinateOrganizationalUnits: string[] = [];

		const containers = await promise;

		if (currentOrganizationalUnit) {
			const relatedOrganizationalUnits = await locals.pool.connect(
				getAllRelatedOrganizationalUnitContainers(currentOrganizationalUnit.guid)
			);
			subordinateOrganizationalUnits = relatedOrganizationalUnits
				.filter(({ payload }) => payload.level > currentOrganizationalUnit.payload.level)
				.map(({ guid }) => guid);
		}

		return filterOrganizationalUnits(
			containers,
			url,
			subordinateOrganizationalUnits,
			currentOrganizationalUnit
		);
	}

	return {
		containers: url.searchParams.has('related-to')
			? await filterOrganizationalUnitsAsync(filterVisibleAsync(containersPromise))
			: filterOrganizationalUnitsAsync(filterVisibleAsync(containersPromise)),
		containersWithIndicatorContributions: await filterVisibleAsync(
			containersWithIndicatorContributionsPromise
		)
	};
}) satisfies PageServerLoad;
