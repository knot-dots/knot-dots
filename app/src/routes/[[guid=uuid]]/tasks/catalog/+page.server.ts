import tasks from '$lib/load/tasks';
import type { PageServerLoad } from '../$types';

export const load: PageServerLoad = async (event) => {
	return await tasks('alpha')(event);
};
