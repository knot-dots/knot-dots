export const featureFlags = new Map([
	[
		'alpha',
		['OpenAI', 'EmbedObjects', 'ContentPartner', 'ResourceV2', 'IOOI', 'SubMeasures'] as const
	],
	['beta', ['ImportFromCsv', 'Mistral', 'NewNavigation'] as const]
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
		useContentPartner() {
			return features.includes('ContentPartner');
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
		useBinaryIndicators() {
			return features.includes('IOOI');
		},
		useTendentialObjectivesAndEffects() {
			return features.includes('IOOI');
		},
		useEmbedObjects() {
			return features.includes('EmbedObjects');
		},
		useSubMeasures() {
			return features.includes('SubMeasures');
		},
		useMegaMenu() {
			return features.includes('NewNavigation');
		}
	} satisfies Record<string, () => boolean>;
}
