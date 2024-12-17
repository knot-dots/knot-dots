export function createFeatureDecisions(features: string[]): Record<string, () => boolean> {
	return {
		useNewOnboardingWorkflow() {
			return features.includes('NewOnboardingWorkflow');
		},
		useImportFromCsv() {
			return features.includes('ImportFromCsv');
		},
		useEditableDetailView() {
			return features.includes('NewEditingExperience');
		},
		useViewModes() {
			return features.includes('NewEditingExperience');
		},
		useObjectivesAndEffectsWorkspace() {
			return features.includes('NewImpactMeasurement');
		}
	};
}
