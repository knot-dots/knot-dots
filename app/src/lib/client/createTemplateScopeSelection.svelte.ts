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
	// Every edit in the dialog replaces the container and thereby scopeGuids. Primitive deriveds
	// keep consumers such as the template list from rerunning when the result stays the same.
	const ready = $derived(scopeGuids.length <= 1);
	const required = $derived(enabled && !!container() && requiresScopedTemplate(container()!));
	const availableIn = $derived.by(() => {
		if (scopeGuids.length > 1) return undefined;
		if (scopeGuids.length) return scopeGuids[0];
		const owner = context();
		return owner && isTemplateScope(owner) ? owner.guid : undefined;
	});
	return {
		get ready() {
			return ready;
		},
		get error() {
			return undefined;
		},
		get required() {
			return required;
		},
		get availableIn() {
			return availableIn;
		}
	};
}

export type TemplateScopeSelection = ReturnType<typeof createTemplateScopeSelection>;
