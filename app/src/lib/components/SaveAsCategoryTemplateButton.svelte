<script lang="ts">
	import { page } from '$app/stores';
	import { _ } from 'svelte-i18n';
	import tooltip from '$lib/attachments/tooltip';
	import saveContainer from '$lib/client/saveContainer';
	import {
		ability
	} from '$lib/stores';
	import {
		container as containerSchema,
		isCategoryContainer,
		isTermContainer,
		newCategoryTemplateFromCategory,
		newTermForCategoryTemplate,
		predicates,
		type AnyContainer,
		type CategoryContainer,
		type OrganizationContainer,
		type TermContainer
	} from '$lib/models';

	interface Props {
		container: CategoryContainer;
		relatedContainers: AnyContainer[];
	}

	let { container, relatedContainers }: Props = $props();

	const predicate = predicates.enum['is-part-of-category'];
	const pageStore = page;

	let saving = $state(false);
	let errorMessage = $state('');
	const defaultOrganization = $derived.by<OrganizationContainer | undefined>(() => {
		const guid = $pageStore.data.defaultOrganizationGuid;
		return $pageStore.data.organizations?.find(({ guid: organizationGuid }) => guid === organizationGuid);
	});

	const currentOrganizationGuid = $derived.by<string | undefined>(() =>
		$pageStore.data.currentOrganization?.guid
	);

	const currentOrganizationIsDefault = $derived.by<boolean>(() =>
		$pageStore.data.currentOrganization?.payload.default ?? false
	);

	const orderedTerms = $derived.by<TermContainer[]>(() =>
		relatedContainers
			.filter(isTermContainer)
			.map((term) => {
				const membership = term.relation.find(
					({ object, predicate: p }) => object === container.guid && p === predicate
				);
				if (!membership) {
					return null;
				}
				return {
					position: membership.position ?? Number.MAX_SAFE_INTEGER,
					term
				};
			})
			.filter((entry): entry is { position: number; term: TermContainer } => Boolean(entry))
			.toSorted((a, b) => {
				if (a.position !== b.position) {
					return a.position - b.position;
				}
				return a.term.payload.title.localeCompare(b.term.payload.title, undefined, {
					sensitivity: 'base'
				});
			})
			.map(({ term }) => term)
	);

	const canSaveAsTemplate = $derived.by(() => {
		if (
			!defaultOrganization ||
			!currentOrganizationGuid ||
			currentOrganizationIsDefault ||
			container.organization !== currentOrganizationGuid ||
			container.organization === defaultOrganization.guid
		) {
			return false;
		}
		const template = newCategoryTemplateFromCategory(container, defaultOrganization);
		return $ability.can('create', template);
	});

	async function handleSave() {
		if (!defaultOrganization || !canSaveAsTemplate || saving) {
			return;
		}

		saving = true;
		errorMessage = '';
		try {
			const response = await saveContainer(
				newCategoryTemplateFromCategory(container, defaultOrganization)
			);
			const payload = await response.json();
			if (!response.ok) {
				throw new Error(payload.message ?? 'Failed to create category template');
			}
			const parsed = containerSchema.safeParse(payload);
			if (!parsed.success || !isCategoryContainer(parsed.data)) {
				throw new Error('Unexpected response while creating category template');
			}
			const createdCategory = parsed.data;
			for (const [index, term] of orderedTerms.entries()) {
				const termResponse = await saveContainer(
					newTermForCategoryTemplate(term, createdCategory.guid, defaultOrganization, index)
				);
				if (!termResponse.ok) {
					const termPayload = await termResponse.json().catch(() => ({}));
					throw new Error(termPayload.message ?? 'Failed to copy term');
				}
			}
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : String(error);
		} finally {
			saving = false;
		}
	}
</script>

{#if canSaveAsTemplate}
	<div class="save-as-category-template">
		<button
			type="button"
			onclick={handleSave}
			disabled={saving}
			{@attach tooltip($_('category.save_as_template'))}
		>
			{$_('category.save_as_template')}
		</button>
		{#if errorMessage}
			<p class="save-as-category-template__error" role="status">{errorMessage}</p>
		{/if}
	</div>
{/if}

<style>
	.save-as-category-template__error {
		color: var(--color-error-600);
		font-size: 0.875rem;
		margin: 0.5rem 0 0;
	}
</style>
