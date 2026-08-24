import { error, json } from '@sveltejs/kit';
import { UniqueIntegrityConstraintViolationError } from 'slonik';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { containerCopyRequest } from '$lib/containerCopy';
import { CopyPlanError } from '$lib/server/containerCopyPlan';
import { executeContainerCopy } from '$lib/server/containerCopyService';
import type { RequestHandler } from './$types';

const maxPlanSize = 10000;

function message(key: string) {
	return unwrapFunctionStore(_)(key);
}

const serviceErrorResponses = {
	source_unavailable: [404, 'error.not_found'],
	unsupported_copy_source: [422, 'error.copy_unsupported_source'],
	invalid_target: [422, 'error.copy_unsupported_source'],
	create_forbidden: [403, 'error.forbidden'],
	copy_too_large: [413, 'error.copy_too_large'],
	individual_profile_exists: [409, 'error.individual_profile_exists']
} as const;

function serviceErrorResponse(caught: unknown) {
	if (typeof caught !== 'object' || caught === null || !('code' in caught)) {
		return undefined;
	}
	const code = caught.code as keyof typeof serviceErrorResponses;
	return serviceErrorResponses[code];
}

export const POST = (async ({ locals, request }) => {
	if (!locals.user.isAuthenticated) {
		error(401, { message: message('error.unauthorized') });
	}

	if (request.headers.get('content-type')?.split(';', 1)[0].trim() !== 'application/json') {
		error(415, { message: message('error.unsupported_media_type') });
	}

	const data = await request.json().catch(() => {
		error(400, { message: message('error.bad_request') });
	});

	const parseResult = containerCopyRequest.safeParse(data);
	if (!parseResult.success) {
		error(422, { message: message('error.copy_invalid') });
	}

	try {
		const root = await executeContainerCopy({
			request: parseResult.data,
			pool: locals.pool,
			user: locals.user,
			maxPlanSize
		});
		return json(root, { status: 201, headers: { location: `/container/${root.guid}` } });
	} catch (caught) {
		const serviceResponse = serviceErrorResponse(caught);

		if (serviceResponse) {
			error(serviceResponse[0], { message: message(serviceResponse[1]) });
		}

		if (caught instanceof CopyPlanError) {
			error(422, { message: message('error.copy_invalid') });
		}

		if (caught instanceof UniqueIntegrityConstraintViolationError) {
			if (
				caught.constraint === 'container_payload_organization_slug_key' ||
				caught.constraint === 'container_payload_organizational_unit_slug_key'
			) {
				error(409, { message: message('error.slug_not_available') });
			}
		}
		throw caught;
	}
}) satisfies RequestHandler;
