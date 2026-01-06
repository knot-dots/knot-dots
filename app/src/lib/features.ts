export const featureFlags = new Map([
	['alpha', ['ImportFromCsv', 'AI', 'Elasticsearch', 'Teaser', 'Stage'] as const],
	['beta', ['AdministrativeArea', 'Report'] as const]
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
			return features.includes('Report');
		},
		useReport() {
			return features.includes('Report');
		},
		useCustomCollection() {
			return features.includes('Report');
		},
		useTeaser() {
			return features.includes('Teaser');
		},
		useStage() {
			return features.includes('Stage');
		}
	};
}
