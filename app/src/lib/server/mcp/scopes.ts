export const mcpScopes = {
	containersRead: 'containers:read',
	containersWrite: 'containers:write',
	organizationsRead: 'organizations:read',
	usersRead: 'users:read'
} as const;

export type McpScope = (typeof mcpScopes)[keyof typeof mcpScopes];

// The scopes MCP apps request when they connect over OAuth. Resolving member
// names is left out, like it is opt-in for personal access tokens: an app has
// to ask for users:read when it first searches users, and the user consents to
// it separately.
export const mcpConnectScopes: McpScope[] = [
	mcpScopes.containersRead,
	mcpScopes.containersWrite,
	mcpScopes.organizationsRead
];
