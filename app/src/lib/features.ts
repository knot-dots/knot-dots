export function createFeatureDecisions(features: string[]): Record<string, () => boolean> {
	return {
		useNewMeasureMonitoringBoard() {
			return features.includes('NewMeasureMonitoring');
		},
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
		}
	};
}
