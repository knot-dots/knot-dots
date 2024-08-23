export function createFeatureDecisions(features: string[]): Record<string, () => boolean> {
	return {
		useNewOnboardingWorkflow() {
			return features.includes('NewOnboardingWorkflow');
		}
	};
}
