export const featureFlags = new Map([
	[
		'alpha',
		[
			'ImportFromCsv',
			'AI',
			'Elasticsearch',
			'TeaserCollection',
			'ContentPartner',
			'ResourcesV2',
			'CustomCategories',
			'IOOI',
			'EditorialPages'
		] as const
	],
	[
		'beta',
		[
			'AdministrativeArea',
			'Image',
			'InfoBox',
			'Quote',
			'Report',
			'Stage',
			'Teaser',
			'TwoColumn'
		] as const
	]
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
		useTeaserCollection() {
			return features.includes('TeaserCollection');
		},
		useInfoBox() {
			return features.includes('InfoBox');
		},
		useQuote() {
			return features.includes('Quote');
		},
		useTwoColumn() {
			return features.includes('TwoColumn');
		},
		useImage() {
			return features.includes('Image');
		},
		useContentPartner() {
			return features.includes('ContentPartner');
		},
		useStage() {
			return features.includes('Stage');
		},
		useResourceWorkspace() {
			return features.includes('ResourcesV2');
		},
		useCustomCategories() {
			return features.includes('CustomCategories');
		},
		useIOOI() {
			return features.includes('IOOI');
		},
		usePage() {
			return features.includes('EditorialPages');
		},
		useFavoriteList() {
			return features.includes('EditorialPages');
		}
	};
}
