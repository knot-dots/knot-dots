import type { LayoutServerLoad } from './$types';
import { loadApplicationContext } from '$lib/server/applicationContext';

// This load must not read the route, the pathname or the search params of the
// URL. Each would rerun it on navigations within the organization, and on the
// client, SvelteKit requests the data of server loads before it runs the
// universal page loads that fetch the data of the boards. The application
// context only reads the hostname, which SvelteKit does not track, and the
// title of the workspace is computed by the universal load in +layout.ts.
export const load = (async ({ depends, locals, params, url }) => {
	depends('app:organization', 'app:organizational_unit');
	return loadApplicationContext({ locals, params, url });
}) satisfies LayoutServerLoad;
