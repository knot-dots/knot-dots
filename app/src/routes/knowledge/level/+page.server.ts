import { filterVisible } from '$lib/authorization';
import { type Container, payloadTypes, predicates } from '$lib/models';
import {
	getAllRelatedContainers,
	getAllRelatedContainersByStrategyType,
	getManyContainers
} from '$lib/server/db';
import type { PageServerLoad } from './$types';

function isRelatedToSome(containers: Container[]) {
	return ({ relation }: Container) =>
		relation.some(
			({ predicate, subject }) =>
				predicate == predicates.enum['is-part-of-strategy'] &&
				containers.find(({ guid }) => guid == subject)
		);
}

export const load = (async ({ locals, url, parent }) => {
	let containers;
	const { currentOrganization } = await parent();

	if (url.searchParams.has('related-to')) {
		containers = await locals.pool.connect(
			getAllRelatedContainers(
				currentOrganization.payload.default ? [] : [currentOrganization.guid],
				url.searchParams.get('related-to') as string,
				[predicates.enum['is-part-of']],
				{ type: [payloadTypes.enum.knowledge] },
				url.searchParams.get('sort') ?? ''
			)
		);
	} else if (url.searchParams.has('strategyType')) {
		containers = await locals.pool.connect(
			getAllRelatedContainersByStrategyType(
				currentOrganization.payload.default ? [] : [currentOrganization.guid],
				url.searchParams.getAll('strategyType'),
				{
					audience: url.searchParams.getAll('audience'),
					categories: url.searchParams.getAll('category'),
					policyFieldsBNK: url.searchParams.getAll('policyFieldBNK'),
					topics: url.searchParams.getAll('topic'),
					terms: url.searchParams.get('terms') ?? '',
					type: [payloadTypes.enum.knowledge]
				},
				url.searchParams.get('sort') ?? ''
			)
		);
	} else {
		containers = await locals.pool.connect(
			getManyContainers(
				currentOrganization.payload.default ? [] : [currentOrganization.guid],
				{
					audience: url.searchParams.getAll('audience'),
					categories: url.searchParams.getAll('category'),
					policyFieldsBNK: url.searchParams.getAll('policyFieldBNK'),
					topics: url.searchParams.getAll('topic'),
					strategyTypes: url.searchParams.getAll('strategyType'),
					terms: url.searchParams.get('terms') ?? '',
					type: [payloadTypes.enum.knowledge]
				},
				url.searchParams.get('sort') ?? ''
			)
		);
	}

	const strategies = await locals.pool.connect(
		getManyContainers(
			currentOrganization.payload.default ? [] : [currentOrganization.guid],
			{ type: [payloadTypes.enum.strategy] },
			url.searchParams.get('sort') ?? ''
		)
	);

	return {
		containers: filterVisible(containers, locals.user),
		strategies: filterVisible(strategies.filter(isRelatedToSome(containers)), locals.user)
	};
}) satisfies PageServerLoad;
