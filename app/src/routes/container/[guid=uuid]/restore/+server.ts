import { error, json } from '@sveltejs/kit';
import { UniqueIntegrityConstraintViolationError } from 'slonik';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { ContainerRestoreError, restoreContainerRecursively } from '$lib/server/db';
import type { RequestHandler } from './$types';

// Reverts the deletion of a container together with the containers and
// relations deleted along with it. Meant for developers undoing accidental
// deletions, hence restricted to sysadmins.
export const POST = (async ({ locals, params }) => {
	if (!locals.user.isAuthenticated) {
		error(401, { message: unwrapFunctionStore(_)('error.unauthorized') });
	}

	if (!locals.user.roles.includes('sysadmin')) {
		error(403, { message: unwrapFunctionStore(_)('error.forbidden') });
	}

	try {
		return json(await locals.pool.connect(restoreContainerRecursively(params.guid)));
	} catch (e) {
		if (e instanceof ContainerRestoreError) {
			if (e.kind === 'not_found') {
				error(404, { message: unwrapFunctionStore(_)('error.not_found') });
			} else {
				error(422, { message: unwrapFunctionStore(_)('error.restore_unsupported') });
			}
		} else if (
			e instanceof UniqueIntegrityConstraintViolationError &&
			e.constraint == 'container_payload_organizational_unit_slug_key'
		) {
			error(409, { message: unwrapFunctionStore(_)('error.slug_not_available') });
		} else {
			throw e;
		}
	}
}) satisfies RequestHandler;
