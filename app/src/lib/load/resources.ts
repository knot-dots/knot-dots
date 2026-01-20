import { filterVisible } from '$lib/authorization';
import { filterOrganizationalUnits, payloadTypes, type ResourceV2Container } from '$lib/models';
import { getManyContainers } from '$lib/server/db';
import type { PageServerLoad } from '../../routes/[[guid=uuid]]/resources/$types';

export default function load(defaultSort: 'alpha' | 'modified' | 'priority') {
	return (async ({ depends, locals, parent, url }) => {
		depends('containers');

		const subordinateOrganizationalUnits: string[] = [];

		const { currentOrganizationalUnit } = await parent();

		// if (currentOrganization.payload.default) {
		// 	error(404, unwrapFunctionStore(_)('error.not_found'));
		// }

		const resourceContainers = (await locals.pool.connect(
			getManyContainers(
				[],
				{
					resourceCategories: url.searchParams.getAll('resourceCategory'),
					type: [payloadTypes.enum.resource_v2]
				},
				url.searchParams.get('sort') ?? defaultSort
			)
		)) as ResourceV2Container[];

		const containers = filterOrganizationalUnits(
			filterVisible(resourceContainers, locals.user),
			url,
			subordinateOrganizationalUnits,
			currentOrganizationalUnit
		);

		return {
			containers,
			relatedContainers: filterOrganizationalUnits(
				filterVisible(containers, locals.user),
				url,
				subordinateOrganizationalUnits,
				currentOrganizationalUnit
			)
		};
	}) satisfies PageServerLoad;
}
