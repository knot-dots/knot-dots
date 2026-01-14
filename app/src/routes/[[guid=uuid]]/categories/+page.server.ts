import { filterVisible } from '$lib/authorization';
import { payloadTypes, predicates } from '$lib/models';
import { getAllRelatedContainers, getManyContainers } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, parent, url }) => {
	const { currentOrganization, defaultOrganizationGuid } = await parent();

	const organizationScope = Array.from(
		new Set(
			[
				currentOrganization.guid,
				defaultOrganizationGuid
			].filter((guid): guid is string => Boolean(guid))
		)
	);

	const searchTerms = url.searchParams.get('terms') ?? '';
	const categorySort = url.searchParams.get('sort') ?? 'alpha';

	if (url.searchParams.has('related-to')) {
		const relations =
			url.searchParams.getAll('relationType').length === 0
				? [
						predicates.enum['is-consistent-with'],
						predicates.enum['is-equivalent-to'],
						predicates.enum['is-inconsistent-with'],
						predicates.enum['contributes-to'],
						predicates.enum['is-part-of-category']
				  ]
				: url.searchParams.getAll('relationType');

		const related = await locals.pool.connect(
			getAllRelatedContainers(
				organizationScope,
				url.searchParams.get('related-to') as string,
				relations,
				{ type: [payloadTypes.enum.category, payloadTypes.enum.term] },
				categorySort
			)
		);

		console.log('Related containers found:', related.length);

		const visible = filterVisible(related, locals.user);

		return {
			containers: visible.filter(({ payload }) => payload.type === payloadTypes.enum.category),
			terms: visible.filter(({ payload }) => payload.type === payloadTypes.enum.term)
		};
	}

	const [containers, terms] = await Promise.all([
		locals.pool.connect(
			getManyContainers(
				organizationScope,
				{
					terms: searchTerms,
					type: [payloadTypes.enum.category]
				},
				categorySort
			)
		),
		locals.pool.connect(
			getManyContainers(
				organizationScope,
				{
					terms: searchTerms,
					type: [payloadTypes.enum.term]
				},
				'alpha'
			)
		)
	]);

	return {
		containers: filterVisible(containers, locals.user),
		terms: filterVisible(terms, locals.user)
	};
}) satisfies PageServerLoad;
