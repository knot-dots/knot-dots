import { filterVisible } from '$lib/authorization';
import { type Container, payloadTypes, predicates } from '$lib/models';
import {
	getAllRelatedContainers,
	getAllRelatedContainersByProgramType,
	getManyContainers
} from '$lib/server/db';
import type { PageServerLoad } from './$types';

function isRelatedToSome(containers: Container[]) {
	return ({ relation }: Container) =>
		relation.some(
			({ predicate, subject }) =>
				predicate == predicates.enum['is-part-of-program'] &&
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
	} else if (url.searchParams.has('programType')) {
		containers = await locals.pool.connect(
			getAllRelatedContainersByProgramType(
				currentOrganization.payload.default ? [] : [currentOrganization.guid],
				url.searchParams.getAll('programType'),
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
					programTypes: url.searchParams.getAll('programType'),
					terms: url.searchParams.get('terms') ?? '',
					type: [payloadTypes.enum.knowledge]
				},
				url.searchParams.get('sort') ?? ''
			)
		);
	}

	const programs = (await locals.pool.connect(
		getManyContainers(
			currentOrganization.payload.default ? [] : [currentOrganization.guid],
			{ type: [payloadTypes.enum.program] },
			url.searchParams.get('sort') ?? ''
		)
	)) as ProgramContainer[];

	return {
		containers: filterVisible(containers, locals.user),
		programs: filterVisible(programs.filter(isRelatedToSome(containers)), locals.user)
	};
}) satisfies PageServerLoad;
