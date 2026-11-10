// ComputedManagedBy, McpServer, MultipleProgramAssignment and PermissionMatrix
// are managed per deployment via pod annotations (see $lib/server/podFeatures)
// and deliberately absent from these user-facing rings.
export const featureFlags = new Map([
	['alpha', ['Adoptions', 'MCP', 'Mistral', 'OpenAI', 'Templating'] as const],
	['beta', ['ImportFromCsv', 'IOOI', 'ResourceV2'] as const]
]);

export function createFeatureDecisions(features: string[]) {
	return {
		useImportFromCsv() {
			return features.includes('ImportFromCsv');
		},
		useOpenAI() {
			return features.includes('OpenAI');
		},
		useMistral() {
			return features.includes('Mistral');
		},
		useResourceWorkspace() {
			return features.includes('ResourceV2');
		},
		useResourcePlanning() {
			return features.includes('ResourceV2');
		},
		useIOOI() {
			return features.includes('IOOI');
		},
		useTendentialObjectivesAndEffects() {
			return features.includes('IOOI');
		},
		useAdoptions() {
			return features.includes('Adoptions');
		},
		useComputedManagedBy() {
			return features.includes('ComputedManagedBy');
		},
		useMultipleProgramAssignment() {
			return features.includes('MultipleProgramAssignment');
		},
		usePermissionMatrix() {
			return features.includes('PermissionMatrix');
		},
		useTemplateWorkspaces() {
			return features.includes('Templating');
		},
		useNewCreateContainerDialog() {
			return features.includes('Templating');
		},
		// The MCP server answers only where the deployment enables it, so it can
		// be switched off at runtime; who may use it is decided by the MCP flag
		// on top.
		useMcpServer() {
			return features.includes('McpServer');
		},
		// Users with the MCP flag see the token menu, may create personal access
		// tokens and may connect OAuth clients.
		useMcp() {
			return features.includes('McpServer') && features.includes('MCP');
		}
	} satisfies Record<string, () => boolean>;
}
