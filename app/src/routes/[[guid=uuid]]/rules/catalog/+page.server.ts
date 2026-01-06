import rules from '$lib/load/rules';
import type { PageServerLoad } from '../$types';

export const load: PageServerLoad = async (event) => {
	return await rules(event);
};
