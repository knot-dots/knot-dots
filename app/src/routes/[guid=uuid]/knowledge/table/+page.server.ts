import knowledge from '$lib/load/knowledge';
import { DEFAULT_PAGE_SIZE } from '$lib/pagination';
import type { PageServerLoad } from '../$types';

export const load = ((event) =>
	knowledge(event, {
		pagination: {
			limit: DEFAULT_PAGE_SIZE,
			offset: 0
		}
	})) satisfies PageServerLoad;
