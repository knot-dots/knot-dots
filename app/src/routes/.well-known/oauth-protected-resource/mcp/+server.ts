import { createFeatureDecisions } from '$lib/features';
import { protectedResourceMetadata } from '$lib/server/mcp/oauth';
import type { RequestHandler } from './$types';

// MCP clients running in a browser, such as the MCP Inspector, read this
// document cross-origin. It is public anyway.
const corsHeaders = { 'Access-Control-Allow-Origin': '*' };

// RFC 9728 Protected Resource Metadata for /mcp: tells MCP clients which
// authorization server issues tokens for it and which scopes it knows.
export const GET: RequestHandler = ({ locals }) => {
	if (!createFeatureDecisions(locals.features).useMcpServer()) {
		return new Response(null, { status: 404 });
	}

	return Response.json(protectedResourceMetadata(), { headers: corsHeaders });
};

export const OPTIONS: RequestHandler = () =>
	new Response(null, {
		headers: {
			...corsHeaders,
			'Access-Control-Allow-Headers': '*',
			'Access-Control-Allow-Methods': 'GET'
		},
		status: 204
	});
