import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import { getOrganizationMemberships, getPool } from '$lib/server/db';
import { listMcpOrganizationalUnits } from '$lib/server/mcp/organizationalUnits';
import {
	registerListOrganizationalUnitsTool,
	type ListOrganizationalUnitsDependencies
} from '$lib/server/mcp/tools/listOrganizationalUnits';
import {
	registerListMyOrganizationsTool,
	type ListMyOrganizationsDependencies
} from '$lib/server/mcp/tools/listMyOrganizations';
import packageMetadata from '../../../../package.json';

type McpServerDependencies = ListMyOrganizationsDependencies & ListOrganizationalUnitsDependencies;

const defaultDependencies: McpServerDependencies = {
	async listOrganizationalUnits(userId, input) {
		return (await getPool()).connect(listMcpOrganizationalUnits({ ...input, userId }));
	},
	async listOrganizationMemberships(userId) {
		return (await getPool()).connect(getOrganizationMemberships(userId));
	}
};

export function createKnotDotsMcpHandler(dependencies: McpServerDependencies) {
	return createMcpHandler(
		({ authInfo }) => {
			const server = new McpServer({
				name: packageMetadata.name,
				version: packageMetadata.version
			});

			registerListOrganizationalUnitsTool(server, authInfo, dependencies);
			registerListMyOrganizationsTool(server, authInfo, dependencies);

			return server;
		},
		{ legacy: 'reject' }
	);
}

export const mcpHandler = createKnotDotsMcpHandler(defaultDependencies);
