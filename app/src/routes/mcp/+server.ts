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

// Responses depend on the bearer token and must never be stored by shared
// caches such as the edge pipeline in front of the load balancer.
function withoutCaching(response: Response): Response {
	const headers = new Headers(response.headers);
	headers.set('Cache-Control', 'no-store, no-transform');
	return new Response(response.body, {
		headers,
		status: response.status,
		statusText: response.statusText
	});
}

const respond: RequestHandler = async ({ locals, request }) => {
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

const handle: RequestHandler = async (event) => withoutCaching(await respond(event));

export { handle as DELETE, handle as GET, handle as POST };
