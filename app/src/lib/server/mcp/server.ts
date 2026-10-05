import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import { getOrganizationMemberships, getPool } from '$lib/server/db';
import {
	listMcpContainerCategories,
	listMcpContainerCategoryValues
} from '$lib/server/mcp/categories';
import { getMcpContainer, searchMcpContainers } from '$lib/server/mcp/containers';
import { addMcpCustomCollectionSection, createMcpContainer } from '$lib/server/mcp/creation';
import { attachMcpIndicator } from '$lib/server/mcp/indicators';
import { listMcpOrganizationalUnits } from '$lib/server/mcp/organizationalUnits';
import {
	addMcpContainerRelation,
	listMcpContainerRelations,
	removeMcpContainerRelation
} from '$lib/server/mcp/relations';
import { updateMcpContainer } from '$lib/server/mcp/update';
import { registerPayloadSchemaResources } from '$lib/server/mcp/resources/payloadSchemas';
import { loadMcpUserContext } from '$lib/server/mcp/userContext';
import { searchMcpOrganizationUsers } from '$lib/server/mcp/users';
import {
	registerAttachIndicatorTool,
	type AttachIndicatorDependencies
} from '$lib/server/mcp/tools/attachIndicator';
import {
	registerAddContainerRelationTool,
	type AddContainerRelationDependencies
} from '$lib/server/mcp/tools/addContainerRelation';
import {
	registerAddCustomCollectionSectionTool,
	type AddCustomCollectionSectionDependencies
} from '$lib/server/mcp/tools/addCustomCollectionSection';
import {
	registerCreateContainerTool,
	type CreateContainerDependencies
} from '$lib/server/mcp/tools/createContainer';
import {
	registerRemoveContainerRelationTool,
	type RemoveContainerRelationDependencies
} from '$lib/server/mcp/tools/removeContainerRelation';
import {
	registerUpdateContainerTool,
	type UpdateContainerDependencies
} from '$lib/server/mcp/tools/updateContainer';
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
	registerListContainerRelationsTool,
	type ListContainerRelationsDependencies
} from '$lib/server/mcp/tools/listContainerRelations';
import {
	registerSearchContainersTool,
	type SearchContainersDependencies
} from '$lib/server/mcp/tools/searchContainers';
import {
	registerSearchOrganizationUsersTool,
	type SearchOrganizationUsersDependencies
} from '$lib/server/mcp/tools/searchOrganizationUsers';
import packageMetadata from '../../../../package.json';

type McpServerDependencies = AddContainerRelationDependencies &
	AddCustomCollectionSectionDependencies &
	AttachIndicatorDependencies &
	CreateContainerDependencies &
	GetContainerDependencies &
	ListContainerCategoriesDependencies &
	ListContainerCategoryValuesDependencies &
	ListContainerRelationsDependencies &
	ListMyOrganizationsDependencies &
	ListOrganizationalUnitsDependencies &
	SearchContainersDependencies &
	SearchOrganizationUsersDependencies &
	RemoveContainerRelationDependencies &
	UpdateContainerDependencies;

const defaultDependencies: McpServerDependencies = {
	async addContainerRelation(auth, input) {
		return (await getPool()).connect(addMcpContainerRelation({ ...input, ...auth }));
	},
	async addCustomCollectionSection(auth, input) {
		return (await getPool()).connect(addMcpCustomCollectionSection({ ...input, ...auth }));
	},
	async attachIndicator(auth, input) {
		return (await getPool()).connect(attachMcpIndicator({ ...input, ...auth }));
	},
	async createContainer(auth, input) {
		return (await getPool()).connect(createMcpContainer({ ...input, ...auth }));
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
	async listContainerRelations(userId, input) {
		return (await getPool()).connect(listMcpContainerRelations({ ...input, userId }));
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
	},
	async removeContainerRelation(auth, input) {
		return (await getPool()).connect(removeMcpContainerRelation({ ...input, ...auth }));
	},
	async updateContainer(auth, input) {
		return (await getPool()).connect(updateMcpContainer({ ...input, ...auth }));
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
						'Read knotdots://schemas/payloads and the matching linked payload schema before calling create_container or update_container. Pass update_container the revision from the latest get_container, create_container or update_container response for that container; there is no need to read it again after your own writes. Look up category keys and values with list_container_categories and list_container_category_values instead of guessing them. The description and body fields are GitHub-flavored Markdown. Call list_container_relations before add_container_relation or remove_container_relation; relations read as subject, predicate, object. Attach indicators to measures and goals with attach_indicator, which creates the effect or objective that links them. Resource availability does not imply that a creation tool is available.'
				}
			);

			registerPayloadSchemaResources(server);

			registerAddContainerRelationTool(server, authInfo, dependencies);
			registerAddCustomCollectionSectionTool(server, authInfo, dependencies);
			registerAttachIndicatorTool(server, authInfo, dependencies);
			registerCreateContainerTool(server, authInfo, dependencies);
			registerGetContainerTool(server, authInfo, dependencies);
			registerListContainerCategoriesTool(server, authInfo, dependencies);
			registerListContainerCategoryValuesTool(server, authInfo, dependencies);
			registerListContainerRelationsTool(server, authInfo, dependencies);
			registerListOrganizationalUnitsTool(server, authInfo, dependencies);
			registerListMyOrganizationsTool(server, authInfo, dependencies);
			registerSearchContainersTool(server, authInfo, dependencies);
			registerSearchOrganizationUsersTool(server, authInfo, dependencies);
			registerRemoveContainerRelationTool(server, authInfo, dependencies);
			registerUpdateContainerTool(server, authInfo, dependencies);

			return server;
		},
		{ legacy: 'stateless' }
	);
}

export const mcpHandler = createKnotDotsMcpHandler(defaultDependencies);
