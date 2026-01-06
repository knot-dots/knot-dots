import goals from '$lib/load/goals';
import type { PageServerLoad } from '../$types';

export const load: PageServerLoad = async (event) => {
	return await goals(event);
};
