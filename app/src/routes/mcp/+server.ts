import {
	hostHeaderValidationResponse,
	originValidationResponse,
	requireBearerAuth
} from '@modelcontextprotocol/server';
import { env } from '$env/dynamic/public';
import { createMcpTokenVerifier } from '$lib/server/mcp/auth';
import { mcpHandler } from '$lib/server/mcp/server';
import type { RequestHandler } from './$types';

const allowedHostname = new URL(env.PUBLIC_BASE_URL).hostname;

const handle: RequestHandler = async ({ locals, request }) => {
	const rejected =
		hostHeaderValidationResponse(request, [allowedHostname]) ??
		originValidationResponse(request, [allowedHostname]);
	if (rejected) {
		return rejected;
	}

	const authenticate = requireBearerAuth({
		verifier: createMcpTokenVerifier(locals.pool)
	});
	const authInfo = await authenticate(request);
	if (authInfo instanceof Response) {
		return authInfo;
	}

	return mcpHandler.fetch(request, { authInfo });
};

export { handle as DELETE, handle as GET, handle as POST };
