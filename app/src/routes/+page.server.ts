import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import type { PageServerLoad } from './$types';

export const load = (async ({ parent }) => {
	const { currentOrganization } = await parent();
	redirect(308, resolve('/[[guid=uuid]]/all/page', { guid: currentOrganization.guid }));
}) satisfies PageServerLoad;
