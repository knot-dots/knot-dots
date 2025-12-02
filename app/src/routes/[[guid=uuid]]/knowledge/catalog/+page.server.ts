import knowledge from '$lib/load/knowledge';
import type { PageServerLoad } from '../$types';

export const load: PageServerLoad = async (event) => {
	const data = await knowledge(event);
	return {
		...data,
		filterBarInitiallyOpen: true
	};
};
