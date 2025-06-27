export const featureFlags = ['ImportFromCsv', 'NewEditingExperience', 'AI'] as const;

export function createFeatureDecisions(features: string[]): Record<string, () => boolean> {
	return {
		useImportFromCsv() {
			return features.includes('ImportFromCsv');
		},
		useEditableDetailView() {
			return features.includes('NewEditingExperience');
		},
		useAI() {
			return features.includes('AI');
		}
	};
}
