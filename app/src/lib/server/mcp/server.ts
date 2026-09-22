import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import { getOrganizationMemberships, getPool } from '$lib/server/db';
import { getMcpContainer, searchMcpContainers } from '$lib/server/mcp/containers';
import { listMcpOrganizationalUnits } from '$lib/server/mcp/organizationalUnits';
import { loadMcpUserContext } from '$lib/server/mcp/userContext';
import {
	registerGetContainerTool,
	type GetContainerDependencies
} from '$lib/server/mcp/tools/getContainer';
import {
	registerListOrganizationalUnitsTool,
	type ListOrganizationalUnitsDependencies
} from '$lib/server/mcp/tools/listOrganizationalUnits';
import {
	registerListMyOrganizationsTool,
	type ListMyOrganizationsDependencies
} from '$lib/server/mcp/tools/listMyOrganizations';
import {
	registerSearchContainersTool,
	type SearchContainersDependencies
} from '$lib/server/mcp/tools/searchContainers';
import packageMetadata from '../../../../package.json';

type McpServerDependencies = GetContainerDependencies &
	ListMyOrganizationsDependencies &
	ListOrganizationalUnitsDependencies &
	SearchContainersDependencies;

const defaultDependencies: McpServerDependencies = {
	async getContainer(userId, guid) {
		return (await getPool()).connect(getMcpContainer({ guid, userId }));
	},
	async listOrganizationalUnits(userId, input) {
		return (await getPool()).connect(listMcpOrganizationalUnits({ ...input, userId }));
	},
	async listOrganizationMemberships(userId) {
		return (await getPool()).connect(getOrganizationMemberships(userId));
	},
	async searchContainers(userId, input) {
		const pool = await getPool();
		const user = await pool.connect((connection) => loadMcpUserContext(connection, userId));
		return searchMcpContainers({ ...input, user });
	}
};

export function createKnotDotsMcpHandler(dependencies: McpServerDependencies) {
	return createMcpHandler(
		({ authInfo }) => {
			const server = new McpServer({
				name: packageMetadata.name,
				version: packageMetadata.version
			});

			registerGetContainerTool(server, authInfo, dependencies);
			registerListOrganizationalUnitsTool(server, authInfo, dependencies);
			registerListMyOrganizationsTool(server, authInfo, dependencies);
			registerSearchContainersTool(server, authInfo, dependencies);

			return server;
		},
		{ legacy: 'stateless' }
	);
}

export const mcpHandler = createKnotDotsMcpHandler(defaultDependencies);
