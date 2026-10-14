import type { DatabasePool } from 'slonik';
import { filterVisible } from '$lib/authorization';
import type { CategoryContext } from '$lib/categoryOptions';
import { type Container, predicates, type ProgramPayload } from '$lib/models';
import { getAllRelatedContainers } from '$lib/server/db';
import type { User } from '$lib/stores';
import { extractCustomCategoryFilters } from '$lib/utils/customCategoryFilters';

// The objects shown on the levels board and in its table view.
export async function fetchProgramParts({
	categoryContext,
	pool,
	program,
	url,
	user
}: {
	categoryContext: CategoryContext;
	pool: DatabasePool;
	program: Container<ProgramPayload>;
	url: URL;
	user: User;
}) {
	const containers = await pool.connect(
		getAllRelatedContainers(
			[program.organization],
			url.searchParams.get('related-to') ?? program.guid,
			[predicates.enum['is-part-of']],
			{
				customCategories: extractCustomCategoryFilters(url, categoryContext.keys),
				statuses: url.searchParams.getAll('status'),
				terms: url.searchParams.get('terms') ?? ''
			},
			url.searchParams.get('sort') ?? ''
		)
	);

	return filterVisible(containers, user);
}
