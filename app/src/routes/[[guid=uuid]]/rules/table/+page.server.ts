import rules from '$lib/load/rules';
import type { PageServerLoad } from '../$types';

export const load: PageServerLoad = async (event) => {
	const data = await rules(event);
	return {
		...data,
		filterBarInitiallyOpen: false
	};
};
