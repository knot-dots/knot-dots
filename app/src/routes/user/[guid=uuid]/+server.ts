import { error, json } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { featureFlags } from '$lib/features';
import { user as userSchema } from '$lib/models';
import { createOrUpdateUser } from '$lib/server/db';
import { updateUser } from '$lib/server/keycloak';
import type { RequestHandler } from './$types';

// Only alpha testers may opt in to alpha features. The profile dialog hides
// them from everyone else, but the request body is user-supplied. They are
// dropped rather than refused: favorites are saved together with all settings
// and must keep working for users who still carry alpha flags.
const alphaFlags = new Set<string>(featureFlags.get('alpha'));

export const PUT = (async ({ locals, request }) => {
	if (!locals.user.isAuthenticated) {
		error(401, { message: unwrapFunctionStore(_)('error.unauthorized') });
	}

	if (request.headers.get('Content-Type') != 'application/json') {
		error(415, { message: unwrapFunctionStore(_)('error.unsupported_media_type') });
	}

	const data = await request.json().catch((reason: SyntaxError) => {
		error(400, { message: reason.message });
	});
	const parseResult = userSchema.safeParse(data);

	if (!parseResult.success) {
		error(422, parseResult.error);
	}

	if (parseResult.data.guid !== locals.user.guid) {
		error(403, { message: unwrapFunctionStore(_)('error.forbidden') });
	}

	const { settings } = parseResult.data;
	const features = locals.user.roles.includes('alpha-testing')
		? settings.features
		: settings.features?.filter((flag) => !alphaFlags.has(flag));
	const userData = { ...parseResult.data, settings: { ...settings, features } };

	const [user] = await Promise.all([
		locals.pool.connect(createOrUpdateUser(userData)),
		updateUser(userData)
	]);

	return json(user, { status: 200, headers: { location: `/user/${user.guid}` } });
}) satisfies RequestHandler;
