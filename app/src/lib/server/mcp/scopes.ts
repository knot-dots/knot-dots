export const mcpScopes = {
	organizationsRead: 'organizations:read'
} as const;

export type McpScope = (typeof mcpScopes)[keyof typeof mcpScopes];
