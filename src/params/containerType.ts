import type { ParamMatcher } from '@sveltejs/kit';
import { isContainerType } from '$lib/models';

export const match = ((param) => {
	return isContainerType(param);
}) satisfies ParamMatcher;
