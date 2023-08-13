import type { PayloadType } from '$lib/models';
import { maybePartOf } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ params, locals, parent }) => {
	const { currentOrganization } = await parent();
	const isPartOfOptions = await locals.pool.connect(
		maybePartOf(currentOrganization.guid, params.type as PayloadType)
	);
	return {
		isPartOfOptions
	};
}) satisfies PageServerLoad;
