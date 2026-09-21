import { page } from '$app/state';
import { type Container, type AnyPayload, type NewContainer } from '$lib/models';
import { createFeatureDecisions } from '$lib/features';
import {
	getTemplateScopeGuids,
	isTemplateScope,
	requiresScopedTemplate
} from '$lib/templateScopes';

/** Resolve actual measure types: simple measures share the placement predicate, not the policy. */
export default function createTemplateScopeSelection(
	container: () => NewContainer | undefined,
	context: () => Container<AnyPayload> | undefined = () => page.data.container
) {
	const enabled = $derived(createFeatureDecisions(page.data.features).useTemplateWorkspaces());
	const scopeGuids = $derived(enabled && container() ? getTemplateScopeGuids(container()!) : []);
	return {
		get ready() {
			return scopeGuids.length <= 1;
		},
		get error() {
			return undefined;
		},
		get required() {
			return enabled && !!container() && requiresScopedTemplate(container()!);
		},
		get availableIn() {
			if (scopeGuids.length > 1) return undefined;
			if (scopeGuids.length) return scopeGuids[0];
			const owner = context();
			return owner && isTemplateScope(owner) ? owner.guid : undefined;
		}
	};
}

export type TemplateScopeSelection = ReturnType<typeof createTemplateScopeSelection>;
