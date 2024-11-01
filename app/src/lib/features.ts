export function createFeatureDecisions(features: string[]): Record<string, () => boolean> {
	return {
		useNewOnboardingWorkflow() {
			return features.includes('NewOnboardingWorkflow');
		},
		useNewRelationOverlay() {
			return features.includes('NewRelations');
		},
		useNewRelationTypeFilter() {
			return features.includes('NewRelations');
		},
		useImportFromCsv() {
			return features.includes('ImportFromCsv');
		},
		useEditableDetailView() {
			return features.includes('NewEditingExperience');
		}
	};
}
