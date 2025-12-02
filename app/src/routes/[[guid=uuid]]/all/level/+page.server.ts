import all from '$lib/load/all';
import type { PageServerLoad } from '../$types';

export const load: PageServerLoad = async (event) => {
	const data = await all(event);
	return {
		...data,
		filterBarInitiallyOpen: false
	};
};
