import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import { getOrganizationMemberships, getPool } from '$lib/server/db';
import {
	listMcpContainerCategories,
	listMcpContainerCategoryValues
} from '$lib/server/mcp/categories';
import { getMcpContainer, searchMcpContainers } from '$lib/server/mcp/containers';
import { addMcpCustomCollectionSection, createMcpContainer } from '$lib/server/mcp/creation';
import { listMcpOrganizationalUnits } from '$lib/server/mcp/organizationalUnits';
import { registerPayloadSchemaResources } from '$lib/server/mcp/resources/payloadSchemas';
import { loadMcpUserContext } from '$lib/server/mcp/userContext';
import { searchMcpOrganizationUsers } from '$lib/server/mcp/users';
import {
	registerAddCustomCollectionSectionTool,
	type AddCustomCollectionSectionDependencies
} from '$lib/server/mcp/tools/addCustomCollectionSection';
import {
	registerCreateContainerTool,
	type CreateContainerDependencies
} from '$lib/server/mcp/tools/createContainer';
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
	registerListContainerCategoriesTool,
	type ListContainerCategoriesDependencies
} from '$lib/server/mcp/tools/listContainerCategories';
import {
	registerListContainerCategoryValuesTool,
	type ListContainerCategoryValuesDependencies
} from '$lib/server/mcp/tools/listContainerCategoryValues';
import {
	registerSearchContainersTool,
	type SearchContainersDependencies
} from '$lib/server/mcp/tools/searchContainers';
import {
	registerSearchOrganizationUsersTool,
	type SearchOrganizationUsersDependencies
} from '$lib/server/mcp/tools/searchOrganizationUsers';
import packageMetadata from '../../../../package.json';

type McpServerDependencies = AddCustomCollectionSectionDependencies &
	CreateContainerDependencies &
	GetContainerDependencies &
	ListContainerCategoriesDependencies &
	ListContainerCategoryValuesDependencies &
	ListMyOrganizationsDependencies &
	ListOrganizationalUnitsDependencies &
	SearchContainersDependencies &
	SearchOrganizationUsersDependencies;

const defaultDependencies: McpServerDependencies = {
	async addCustomCollectionSection(userId, input) {
		return (await getPool()).connect(addMcpCustomCollectionSection({ ...input, userId }));
	},
	async createContainer(userId, input) {
		return (await getPool()).connect(createMcpContainer({ ...input, userId }));
	},
	async getContainer(userId, guid) {
		return (await getPool()).connect(getMcpContainer({ guid, userId }));
	},
	async listContainerCategories(userId, input) {
		return (await getPool()).connect(listMcpContainerCategories({ ...input, userId }));
	},
	async listContainerCategoryValues(userId, input) {
		return (await getPool()).connect(listMcpContainerCategoryValues({ ...input, userId }));
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
	},
	async searchOrganizationUsers(userId, input) {
		return (await getPool()).connect(searchMcpOrganizationUsers({ ...input, userId }));
	}
};

export function createKnotDotsMcpHandler(dependencies: McpServerDependencies) {
	return createMcpHandler(
		({ authInfo }) => {
			const server = new McpServer(
				{
					name: packageMetadata.name,
					version: packageMetadata.version
				},
				{
					instructions:
						'Read knotdots://schemas/payloads and the matching linked payload schema before calling create_container. Resource availability does not imply that a creation tool is available.'
				}
			);

			registerPayloadSchemaResources(server);

			registerAddCustomCollectionSectionTool(server, authInfo, dependencies);
			registerCreateContainerTool(server, authInfo, dependencies);
			registerGetContainerTool(server, authInfo, dependencies);
			registerListContainerCategoriesTool(server, authInfo, dependencies);
			registerListContainerCategoryValuesTool(server, authInfo, dependencies);
			registerListOrganizationalUnitsTool(server, authInfo, dependencies);
			registerListMyOrganizationsTool(server, authInfo, dependencies);
			registerSearchContainersTool(server, authInfo, dependencies);
			registerSearchOrganizationUsersTool(server, authInfo, dependencies);

			return server;
		},
		{ legacy: 'stateless' }
	);
}

export const mcpHandler = createKnotDotsMcpHandler(defaultDependencies);
