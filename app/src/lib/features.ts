export const featureFlags = new Map([
	['alpha', ['ImportFromCsv', 'AI', 'Teaser', 'Stage'] as const],
	['beta', ['AdministrativeArea'] as const]
]);

export function createFeatureDecisions(features: string[]): Record<string, () => boolean> {
	return {
		useImportFromCsv() {
			return features.includes('ImportFromCsv');
		},
		useAI() {
			return features.includes('AI');
		},
		useAdministrativeArea() {
			return features.includes('AdministrativeArea');
		},
		useTeaser() {
			return features.includes('Teaser');
		},
		useStage() {
			return features.includes('Stage');
		}
	};
}
