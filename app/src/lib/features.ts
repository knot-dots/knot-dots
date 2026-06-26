export const featureFlags = new Map([
	['alpha', ['OpenAI', 'BulkActions'] as const],
	['beta', ['ImportFromCsv', 'IOOI', 'Mistral', 'ResourceV2', 'SubMeasures'] as const]
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
		useBinaryIndicators() {
			return features.includes('IOOI');
		},
		useTendentialObjectivesAndEffects() {
			return features.includes('IOOI');
		},
		useSubMeasures() {
			return features.includes('SubMeasures');
		},
		useBulkActions() {
			return features.includes('BulkActions');
		}
	} satisfies Record<string, () => boolean>;
}
