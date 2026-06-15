import type { ParamMatcher } from '@sveltejs/kit';
import { z } from 'zod';

export const match = ((param) => {
	const isUuid = z.string().uuid().safeParse(param).success;
	const isSlug = /^[a-z0-9-]+$/.test(param) && !param.startsWith('_');

	return isUuid || isSlug;
}) satisfies ParamMatcher;
