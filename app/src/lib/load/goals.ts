import { filterVisible } from '$lib/authorization';
import { filterOrganizationalUnits, payloadTypes, predicates } from '$lib/models';
import {
	getAllRelatedContainers,
	getAllRelatedContainersByProgramType,
	getAllRelatedOrganizationalUnitContainers,
	getManyContainers
} from '$lib/server/db';
import type { PageServerLoad } from '../../routes/[[guid=uuid]]/goals/$types';

export default (async function load({ depends, locals, parent, url }) {
	depends('containers');

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
		[containers] = await Promise.all([
			locals.pool.connect(
				getAllRelatedContainers(
					currentOrganization.payload.default ? [] : [currentOrganization.guid],
					url.searchParams.get('related-to') as string,
					url.searchParams.getAll('relationType').length == 0
						? [
								predicates.enum['is-consistent-with'],
								predicates.enum['is-equivalent-to'],
								predicates.enum['is-inconsistent-with'],
								predicates.enum['is-part-of']
							]
						: url.searchParams.getAll('relationType'),
					{
						type: [payloadTypes.enum.goal]
					},
					url.searchParams.get('sort') ?? ''
				)
			)
		]);
	} else if (url.searchParams.has('programType')) {
		[containers] = await Promise.all([
			locals.pool.connect(
				getAllRelatedContainersByProgramType(
					currentOrganization.payload.default ? [] : [currentOrganization.guid],
					url.searchParams.getAll('programType'),
					{
						audience: url.searchParams.getAll('audience'),
						categories: url.searchParams.getAll('category'),
						policyFieldsBNK: url.searchParams.getAll('policyFieldBNK'),
						terms: url.searchParams.get('terms') ?? '',
						topics: url.searchParams.getAll('topic'),
						type: [payloadTypes.enum.goal]
					},
					url.searchParams.get('sort') ?? ''
				)
			)
		]);
	} else {
		[containers] = await Promise.all([
			locals.pool.connect(
				getManyContainers(
					currentOrganization.payload.default ? [] : [currentOrganization.guid],
					{
						audience: url.searchParams.getAll('audience'),
						categories: url.searchParams.getAll('category'),
						policyFieldsBNK: url.searchParams.getAll('policyFieldBNK'),
						programTypes: url.searchParams.getAll('programType'),
						topics: url.searchParams.getAll('topic'),
						terms: url.searchParams.get('terms') ?? '',
						type: [payloadTypes.enum.goal]
					},
					url.searchParams.get('sort') ?? ''
				)
			)
		]);
	}

	return {
		containers: filterOrganizationalUnits(
			filterVisible(containers, locals.user),
			url,
			subordinateOrganizationalUnits,
			currentOrganizationalUnit
		)
	};
} satisfies PageServerLoad);
