import { z } from 'zod';
import { getRequestEvent, query } from '$app/server';
import { getIndicatorDataWegweiserKommune } from '$lib/server/db';

export const fetchIndicatorDataWegweiserKommune = query(
	z.object({ spatialReference: z.string().uuid(), friendlyUrl: z.string() }),
	async ({ spatialReference, friendlyUrl }) =>
		getRequestEvent().locals.pool.connect(
			getIndicatorDataWegweiserKommune(spatialReference, friendlyUrl)
		)
);
