import programs from '$lib/load/programs';
import type { PageServerLoad } from '../$types';

export const load: PageServerLoad = async (event) => {
	return await programs(event);
};
