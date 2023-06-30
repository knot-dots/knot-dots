import type { ParamMatcher } from '@sveltejs/kit';
import { isPayloadType } from '$lib/models';

export const match = ((param) => {
	return isPayloadType(param);
}) satisfies ParamMatcher;
