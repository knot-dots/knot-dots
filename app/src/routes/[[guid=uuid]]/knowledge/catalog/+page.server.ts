import knowledge from '$lib/load/knowledge';
import type { PageServerLoad } from '../$types';

export const load: PageServerLoad = async (event) => {
	return await knowledge(event);
};
