import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import { getAdministrativeAreaByGeometry, getAdministrativeAreaSummaries } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET = (async ({ locals, url }) => {
	const params = z
		.object({
			geometry: z.string().uuid().optional(),
			name: z.string().optional()
		})
		.safeParse({
			geometry: url.searchParams.get('geometry') ?? undefined,
			name: url.searchParams.get('name') ?? undefined
		});

	if (!params.success) {
		error(400, { message: params.error.message });
	}

	if (params.data.geometry) {
		return json(await locals.pool.connect(getAdministrativeAreaByGeometry(params.data.geometry)));
	}

	if (params.data.name) {
		return json(await locals.pool.connect(getAdministrativeAreaSummaries(params.data.name)));
	}

	error(400, { message: 'Expected geometry or name search parameter' });
}) satisfies RequestHandler;
