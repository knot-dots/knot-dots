import { DEFAULT_PAGE_SIZE } from '$lib/pagination';
import help from '$lib/load/help';
import type { PageServerLoad } from '../$types';

export const load = ((event) =>
	help(event, {
		pagination: {
			limit: DEFAULT_PAGE_SIZE,
			offset: 0
		}
	})) satisfies PageServerLoad;
