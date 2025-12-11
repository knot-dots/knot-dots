export const featureFlags = new Map([
	['alpha', ['ImportFromCsv', 'AI', 'Elasticsearch'] as const],
	['beta', ['AdministrativeArea', 'Chapter'] as const]
]);

export function createFeatureDecisions(features: string[]): Record<string, () => boolean> {
	return {
		useImportFromCsv() {
			return features.includes('ImportFromCsv');
		},
		useAI() {
			return features.includes('AI');
		},
		useElasticsearch() {
			return features.includes('Elasticsearch');
		},
		useAdministrativeArea() {
			return features.includes('AdministrativeArea');
		},
		useChapter() {
			return features.includes('Chapter');
		}
	};
}
