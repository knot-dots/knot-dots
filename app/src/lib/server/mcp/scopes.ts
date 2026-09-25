export const mcpScopes = {
	containersRead: 'containers:read',
	organizationsRead: 'organizations:read'
} as const;

export type McpScope = (typeof mcpScopes)[keyof typeof mcpScopes];
