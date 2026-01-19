import { error, type ServerLoad } from '@sveltejs/kit';
import { filterVisible } from '$lib/authorization';
import { payloadTypes, predicates, type Container } from '$lib/models';
import { getAllRelatedContainers, getManyContainers } from '$lib/server/db';

export const load: ServerLoad = async ({ locals, parent, url }) => {
	if (!locals.user.isAuthenticated || !locals.user.roles.includes('sysadmin')) {
		error(403, { message: 'forbidden' });
	}

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

	const splitTerms = (terms: Container[]) =>
		terms.reduce(
			(result, term) => {
				const hasParentTerm = term.relation.some(
					({ predicate, subject, object }) =>
						predicate === predicates.enum['is-part-of'] && subject === term.guid && object !== term.guid
				);

				if (hasParentTerm) {
					result.subterms.push(term);
				} else {
					result.terms.push(term);
				}

				return result;
			},
			{ terms: [] as Container[], subterms: [] as Container[] }
		);

	const uniqueByGuid = (containers: Container[]) => {
		const seen = new Set<string>();
		return containers.filter(({ guid }) => {
			if (seen.has(guid)) return false;
			seen.add(guid);
			return true;
		});
	};

	if (url.searchParams.has('related-to')) {
		const relations =
			url.searchParams.getAll('relationType').length === 0
				? [
						predicates.enum['is-consistent-with'],
						predicates.enum['is-equivalent-to'],
						predicates.enum['is-inconsistent-with'],
						predicates.enum['contributes-to'],
						predicates.enum['is-part-of-category'],
						predicates.enum['is-part-of']
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
		const visibleTerms = visible.filter(({ payload }) => payload.type === payloadTypes.enum.term);

		const parentContainers = (
			await Promise.all(
				visibleTerms.map((term) =>
					locals.pool.connect(
						getAllRelatedContainers(
							organizationScope,
							term.guid,
							[predicates.enum['is-part-of'], predicates.enum['is-part-of-category']],
							{ type: [payloadTypes.enum.category, payloadTypes.enum.term] },
							categorySort
						)
					)
				)
			)
		).flat();

		const visibleParents = filterVisible(parentContainers, locals.user);
		const allTermsBase = uniqueByGuid([
			...visibleTerms,
			...visibleParents.filter(({ payload }) => payload.type === payloadTypes.enum.term)
		]);

		const { terms, subterms } = splitTerms(allTermsBase);

		const extraSubterms = (
			await Promise.all(
				terms.map((term) =>
					locals.pool.connect(
						getAllRelatedContainers(
							organizationScope,
							term.guid,
							[predicates.enum['is-part-of']],
							{
								type: [payloadTypes.enum.term]
							},
							categorySort
						)
					)
				)
			)
		).flat();

		const mergedCategories = uniqueByGuid([
			...visible.filter(({ payload }) => payload.type === payloadTypes.enum.category),
			...visibleParents.filter(({ payload }) => payload.type === payloadTypes.enum.category)
		]);

		const mergedSubterms = uniqueByGuid([
			...subterms,
			...splitTerms(filterVisible(extraSubterms, locals.user)).subterms
		]);

		return {
			containers: mergedCategories,
			terms,
			subterms: mergedSubterms
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

	const visibleContainers = filterVisible(containers, locals.user);
	const visibleTerms = filterVisible(terms, locals.user);
	const { terms: rootTerms, subterms } = splitTerms(visibleTerms);

	return {
		containers: visibleContainers,
		terms: rootTerms,
		subterms
	};
};
