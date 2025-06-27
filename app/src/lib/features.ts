export const featureFlags = ['ImportFromCsv', 'AI'] as const;

export function createFeatureDecisions(features: string[]): Record<string, () => boolean> {
	return {
		useImportFromCsv() {
			return features.includes('ImportFromCsv');
		},
		useAI() {
			return features.includes('AI');
		}
	};
}
