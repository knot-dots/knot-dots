import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { loadApplicationContext } from '$lib/server/applicationContext';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, params, url }) => {
	const { currentOrganization } = await loadApplicationContext({ locals, params, url });
	redirect(308, resolve('/[guid=uuid]', { guid: currentOrganization.guid }));
}) satisfies PageServerLoad;
