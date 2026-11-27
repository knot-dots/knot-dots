import { loadApplicationContext } from '$lib/server/applicationContext';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ depends, locals, params, url }) => {
	depends('app:organization', 'app:organizational_unit');
	const context = await loadApplicationContext({ locals, params, url });
	return { ...context };
};
