export const featureFlags = new Map([
	[
		'alpha',
		[
			'OpenAI',
			'Elasticsearch',
			'EmbedObjects',
			'ContentPartner',
			'ResourceV2',
			'CustomCategories',
			'IOOI',
			'SubMeasures'
		] as const
	],
	[
		'beta',
		[
			'EditorialPages',
			'FullScreenRoutes',
			'ImportFromCsv',
			'Mistral',
			'Report',
			'TeaserCollection'
		] as const
	]
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
		useElasticsearch() {
			return features.includes('Elasticsearch');
		},
		useChapter() {
			return features.includes('Report');
		},
		useReport() {
			return features.includes('Report');
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
		useCustomCategories() {
			return features.includes('CustomCategories');
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
		usePage() {
			return features.includes('EditorialPages');
		},
		useEmbedObjects() {
			return features.includes('EmbedObjects');
		},
		useSubMeasures() {
			return features.includes('SubMeasures');
		},
		useFullScreenRoutes() {
			return features.includes('FullScreenRoutes');
		}
	} satisfies Record<string, () => boolean>;
}
