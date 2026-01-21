import { error, type ServerLoad } from '@sveltejs/kit';
import { filterVisible } from '$lib/authorization';
import { payloadTypes, predicates, type Container } from '$lib/models';
import { getManyContainers } from '$lib/server/db';

export const load: ServerLoad = async ({ locals, parent, url }) => {
	if (!locals.user.isAuthenticated || !locals.user.roles.includes('sysadmin')) {
		error(403, { message: 'forbidden' });
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

	const splitTerms = (terms: Container[]) =>
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
			{ terms: [] as Container[], subterms: [] as Container[] }
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
