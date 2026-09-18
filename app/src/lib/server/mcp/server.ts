import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import packageMetadata from '../../../../package.json';

export const mcpHandler = createMcpHandler(
	() =>
		new McpServer({
			name: packageMetadata.name,
			version: packageMetadata.version
		}),
	{ legacy: 'reject' }
);
