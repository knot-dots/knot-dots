import {
	bearerAuthChallengeResponse,
	hostHeaderValidationResponse,
	originValidationResponse,
	verifyBearerToken,
	type AuthInfo
} from '@modelcontextprotocol/server';
import { env } from '$env/dynamic/public';
import { createFeatureDecisions } from '$lib/features';
import { findUser } from '$lib/server/db';
import { getUserFeatures } from '$lib/server/features';
import { createMcpTokenVerifier, mcpAuthExtra } from '$lib/server/mcp/auth';
import { mcpResourceMetadataUrl, mcpResourceUrl } from '$lib/server/mcp/oauth';
import { mcpConnectScopes } from '$lib/server/mcp/scopes';
import { mcpHandler } from '$lib/server/mcp/server';
import type { RequestHandler } from './$types';

const allowedHostname = new URL(env.PUBLIC_BASE_URL).hostname;

// Personal access tokens can only be created by users with the MCP flag, but
// anyone with an account in the Keycloak realm can obtain an OAuth access
// token. Requiring the flag also guarantees that the user has a row, which the
// tools need; it exists once the user has signed in to the web application.
async function mayUseMcp(locals: App.Locals, userId: string) {
	const user = await locals.pool.connect(findUser(userId));
	if (!user) {
		return false;
	}

	return createFeatureDecisions([
		...locals.features,
		...(await getUserFeatures(user.settings))
	]).useMcp();
}

const handle: RequestHandler = async ({ locals, request }) => {
	if (!createFeatureDecisions(locals.features).useMcpServer()) {
		return new Response(null, { status: 404 });
	}

	const rejected =
		hostHeaderValidationResponse(request, [allowedHostname]) ??
		originValidationResponse(request, [allowedHostname]);
	if (rejected) {
		return rejected;
	}

	const resourceMetadataUrl = mcpResourceMetadataUrl();
	let authInfo: AuthInfo;
	try {
		authInfo = await verifyBearerToken(
			request.headers.get('authorization')?.split(',')[0] || undefined,
			{
				expectedResource: mcpResourceUrl(),
				resourceMetadataUrl,
				verifier: createMcpTokenVerifier(locals.pool)
			}
		);
	} catch (error) {
		// The challenge names the scopes OAuth clients should request when they
		// connect. Unlike requireBearerAuth, nothing enforces them here: read-only
		// personal tokens stay valid, and each tool checks the scope it needs.
		return bearerAuthChallengeResponse(error, {
			requiredScopes: mcpConnectScopes,
			resourceMetadataUrl
		});
	}

	const auth = mcpAuthExtra.safeParse(authInfo.extra);
	if (auth.success && auth.data.clientId && !(await mayUseMcp(locals, auth.data.userId))) {
		// A plain refusal without an OAuth challenge: signing in again would
		// not help, so clients must not be prompted to.
		return Response.json(
			{
				error: 'access_denied',
				error_description: 'MCP is not enabled for this account.'
			},
			{ status: 403 }
		);
	}

	return mcpHandler.fetch(request, { authInfo });
};

export { handle as DELETE, handle as GET, handle as POST };
