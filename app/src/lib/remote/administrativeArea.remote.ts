import { z } from 'zod';
import { getRequestEvent, query } from '$app/server';
import { getAdministrativeAreas } from '$lib/server/db';

export const fetchAdministrativeAreas = query(z.string().optional(), async (name) =>
	name ? getRequestEvent().locals.pool.connect(getAdministrativeAreas(name)) : []
);
