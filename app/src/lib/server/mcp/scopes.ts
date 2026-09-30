export const mcpScopes = {
	containersRead: 'containers:read',
	containersWrite: 'containers:write',
	organizationsRead: 'organizations:read',
	usersRead: 'users:read'
} as const;

export type McpScope = (typeof mcpScopes)[keyof typeof mcpScopes];
