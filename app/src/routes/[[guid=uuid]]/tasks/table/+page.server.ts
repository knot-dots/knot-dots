import tasks from '$lib/load/tasks';
import type { PageServerLoad } from '../$types';

export const load: PageServerLoad = async (event) => {
	const data = await tasks('alpha')(event);
	return {
		...data,
		filterBarInitiallyOpen: false
	};
};
