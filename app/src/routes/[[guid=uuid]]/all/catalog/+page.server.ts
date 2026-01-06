import all from '$lib/load/all';
import type { PageServerLoad } from '../$types';

export const load: PageServerLoad = async (event) => {
	return await all(event);
};
