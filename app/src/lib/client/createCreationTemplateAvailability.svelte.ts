import type { NewContainer, PayloadType } from '$lib/models';
import createTemplateScopeSelection from '$lib/client/createTemplateScopeSelection.svelte';
import createScopedTemplateAvailability from '$lib/client/createScopedTemplateAvailability.svelte';

/** Share the dialog's destination policy with creation buttons. */
export default function createCreationTemplateAvailability(
	draft: () => NewContainer | undefined,
	candidateTypes: () => readonly PayloadType[] = () => (draft() ? [draft()!.payload.type] : [])
) {
	const scope = createTemplateScopeSelection(draft);
	const availability = createScopedTemplateAvailability({
		candidateTypes,
		organizationGuid: () => draft()?.organization ?? '',
		scopeGuid: () => (scope.required ? scope.availableIn : undefined)
	});
	return {
		has(type: PayloadType) {
			return scope.ready && availability.has(type);
		}
	};
}
