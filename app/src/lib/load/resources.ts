import { filterVisible } from '$lib/authorization';
import { createFeatureDecisions } from '$lib/features';
import { filterOrganizationalUnits, payloadTypes, type ResourceV2Container } from '$lib/models';
import { getManyContainers } from '$lib/server/db';
import { getManyContainersWithES } from '$lib/server/elasticsearch';
import type { ServerLoad } from '@sveltejs/kit';

type LoadInput = {
	depends: (deps: string) => void;
	locals: App.Locals;
	parent: () => Promise<unknown>;
	url: URL;
};

type ParentData = {
	currentOrganizationalUnit: import('$lib/models').OrganizationalUnitContainer | null;
};

export default function load(defaultSort: 'alpha' | 'modified' | 'priority') {
	return (async ({ depends, locals, parent, url }: LoadInput) => {
		depends('containers');

		const subordinateOrganizationalUnits: string[] = [];

		const { currentOrganizationalUnit } = (await parent()) as ParentData;
		const features = createFeatureDecisions(locals.features);

		const resourceContainers = (await locals.pool.connect(
			features.useElasticsearch()
				? getManyContainersWithES(
						[],
						{
							resourceCategories: url.searchParams.getAll('resourceCategory'),
							type: [payloadTypes.enum.resource_v2]
						},
						url.searchParams.get('sort') ?? defaultSort
					)
				: getManyContainers(
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
			currentOrganizationalUnit ?? undefined
		);

		return {
			containers,
			relatedContainers: filterOrganizationalUnits(
				filterVisible(containers, locals.user),
				url,
				subordinateOrganizationalUnits,
				currentOrganizationalUnit ?? undefined
			)
		};
	}) satisfies ServerLoad;
}
