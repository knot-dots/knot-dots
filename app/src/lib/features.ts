// ComputedManagedBy and MultipleProgramAssignment are managed per deployment
// via pod annotations (see $lib/server/podFeatures) and deliberately absent
// from these user-facing rings.
export const featureFlags = new Map([
	['alpha', ['OpenAI', 'Adoptions'] as const],
	[
		'beta',
		[
			'BulkActions',
			'ComputedProgress',
			'ImportFromCsv',
			'IOOI',
			'Mistral',
			'NewPropertyPanel',
			'ResourceV2',
			'SubMeasures',
			'UrlSlug'
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
		useUrlSlug() {
			return features.includes('UrlSlug');
		},
		useSubMeasures() {
			return features.includes('SubMeasures');
		},
		useBulkActions() {
			return features.includes('BulkActions');
		},
		useAdoptions() {
			return features.includes('Adoptions');
		},
		useComputedManagedBy() {
			return features.includes('ComputedManagedBy');
		},
		useComputedProgress() {
			return features.includes('ComputedProgress');
		},
		useMultipleProgramAssignment() {
			return features.includes('MultipleProgramAssignment');
		},
		useNewPropertyPanel() {
			return features.includes('NewPropertyPanel');
		}
	} satisfies Record<string, () => boolean>;
}
