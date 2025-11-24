import goals from '$lib/load/goals';
import type { PageServerLoad } from '../$types';

export const load: PageServerLoad = async (event) => {
	const data = await goals(event);
	return {
		...data,
		filterBarInitiallyOpen: true
	};
};
