import { error, fail } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { z } from 'zod';
import {
	createMcpToken as insertMcpToken,
	getMcpTokensForUser,
	revokeMcpToken
} from '$lib/server/db';
import { mcpScopes } from '$lib/server/mcp/scopes';
import { generateMcpToken } from '$lib/server/mcp/tokens';
import type { Actions, PageServerLoad } from './$types';

const tokenName = z.string().trim().min(1).max(100);
const tokenId = z.uuid();
const scopes = [mcpScopes.containersRead, mcpScopes.organizationsRead];

function requireAuthenticatedUser(locals: App.Locals) {
	if (!locals.user.isAuthenticated) {
		error(401, { message: unwrapFunctionStore(_)('error.unauthorized') });
	}

	return locals.user;
}

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireAuthenticatedUser(locals);

	return {
		title: unwrapFunctionStore(_)('mcp_tokens.title'),
		tokens: await locals.pool.connect(getMcpTokensForUser(user.guid))
	};
};

export const actions = {
	create: async ({ locals, request }) => {
		const user = requireAuthenticatedUser(locals);
		const data = await request.formData();
		const name = tokenName.safeParse(data.get('name'));

		if (!name.success) {
			return fail(400, { action: 'create', error: 'invalid_name' });
		}

		const generatedToken = generateMcpToken();
		await locals.pool.connect(
			insertMcpToken({
				name: name.data,
				prefix: generatedToken.prefix,
				scopes,
				secretHash: generatedToken.secretHash,
				userId: user.guid
			})
		);

		return { action: 'create', createdToken: generatedToken.token };
	},
	revoke: async ({ locals, request }) => {
		const user = requireAuthenticatedUser(locals);
		const data = await request.formData();
		const id = tokenId.safeParse(data.get('id'));

		if (!id.success) {
			return fail(400, { action: 'revoke', error: 'invalid_token' });
		}

		if (!(await locals.pool.connect(revokeMcpToken(id.data, user.guid)))) {
			return fail(404, { action: 'revoke', error: 'invalid_token' });
		}

		return { action: 'revoke', revoked: true };
	}
} satisfies Actions;
