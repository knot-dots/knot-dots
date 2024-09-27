export function createFeatureDecisions(features: string[]): Record<string, () => boolean> {
	return {
		useNewOnboardingWorkflow() {
			return features.includes('NewOnboardingWorkflow');
		},
		useImportFromCsv() {
			return features.includes('ImportFromCsv');
		}
	};
}
