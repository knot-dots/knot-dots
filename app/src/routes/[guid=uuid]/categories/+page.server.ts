import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { filterVisible } from '$lib/authorization';
import { type AnyContainer, payloadTypes, predicates } from '$lib/models';
import { getManyContainers } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent, url }) => {
	if (!locals.user.isAuthenticated) {
		error(401, { message: unwrapFunctionStore(_)('error.unauthorized') });
	}

	const { currentOrganization, defaultOrganizationGuid } = await parent();

	const organizationScope = Array.from(
		new Set(
			[currentOrganization.guid, defaultOrganizationGuid].filter((guid): guid is string =>
				Boolean(guid)
			)
		)
	);

	const searchTerms = url.searchParams.get('terms') ?? '';
	const categorySort = url.searchParams.get('sort') ?? 'alpha';

	const splitTerms = (terms: AnyContainer[]) =>
		terms.reduce(
			(result, term) => {
				const hasParentTerm = term.relation.some(
					({ predicate, subject, object }) =>
						predicate === predicates.enum['is-part-of'] &&
						subject === term.guid &&
						object !== term.guid
				);

				if (hasParentTerm) {
					result.subterms.push(term);
				} else {
					result.terms.push(term);
				}

				return result;
			},
			{ terms: [] as AnyContainer[], subterms: [] as AnyContainer[] }
		);

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
