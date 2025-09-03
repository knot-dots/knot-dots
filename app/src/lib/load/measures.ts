import {
	getAllRelatedContainers,
	getAllRelatedContainersByProgramType,
	getAllRelatedOrganizationalUnitContainers,
	getManyContainers
} from '$lib/server/db';
import { filterOrganizationalUnits, filterMembers, payloadTypes, predicates } from '$lib/models';
import { filterVisible } from '$lib/authorization';
import type { PageServerLoad } from '../../routes/[guid=uuid]/measures/$types';

export default (async function load({ locals, url, parent }) {
	let containers;
	let subordinateOrganizationalUnits: string[] = [];
	const { currentOrganization, currentOrganizationalUnit } = await parent();

	if (currentOrganizationalUnit) {
		const relatedOrganizationalUnits = await locals.pool.connect(
			getAllRelatedOrganizationalUnitContainers(currentOrganizationalUnit.guid)
		);
		subordinateOrganizationalUnits = relatedOrganizationalUnits
			.filter(({ payload }) => payload.level > currentOrganizationalUnit.payload.level)
			.map(({ guid }) => guid);
	}

	if (url.searchParams.has('related-to')) {
		containers = await locals.pool.connect(
			getAllRelatedContainers(
				currentOrganization.payload.default ? [] : [currentOrganization.guid],
				url.searchParams.get('related-to') as string,
				url.searchParams.getAll('relationType').length == 0
					? [
							predicates.enum['is-consistent-with'],
							predicates.enum['is-equivalent-to'],
							predicates.enum['is-inconsistent-with'],
							predicates.enum['is-prerequisite-for']
						]
					: url.searchParams.getAll('relationType'),
				{},
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
					measureTypes: url.searchParams.getAll('measureType'),
					terms: url.searchParams.get('terms') ?? '',
					topics: url.searchParams.getAll('topic')
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
					measureTypes: url.searchParams.getAll('measureType'),
					policyFieldsBNK: url.searchParams.getAll('policyFieldBNK'),
					programTypes: url.searchParams.getAll('programType'),
					terms: url.searchParams.get('terms') ?? '',
					topics: url.searchParams.getAll('topic'),
					type: [payloadTypes.enum.measure, payloadTypes.enum.simple_measure]
				},
				url.searchParams.get('sort') ?? ''
			)
		);
	}

	return {
		containers: filterMembers(
			filterOrganizationalUnits(
				filterVisible(containers, locals.user),
				url,
				subordinateOrganizationalUnits,
				currentOrganizationalUnit
			),
			url.searchParams.getAll('member')
		)
	};
} satisfies PageServerLoad);
