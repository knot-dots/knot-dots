import programs from '$lib/load/programs';
import type { PageServerLoad } from '../$types';

export const load: PageServerLoad = async (event) => {
	const data = await programs(event);
	return {
		...data,
		filterBarInitiallyOpen: true
	};
};
