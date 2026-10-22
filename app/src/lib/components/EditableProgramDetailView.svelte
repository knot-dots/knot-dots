<script lang="ts">
	import { resource } from 'runed';
	import { getContext, type Snippet } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Plus from '~icons/knotdots/plus';
	import { page } from '$app/state';
	import { buildCategoryFacetsWithCounts } from '$lib/categoryOptions';
	import autoSave from '$lib/client/autoSave';
	import createScopedTemplateAvailability from '$lib/client/createScopedTemplateAvailability.svelte';
	import fetchRelatedContainers from '$lib/client/fetchRelatedContainers';
	import requestSubmit from '$lib/client/requestSubmit';
	import AdoptButton from '$lib/components/AdoptButton.svelte';
	import AskAIButton from '$lib/components/AskAIButton.svelte';
	import CreateAnotherButton from '$lib/components/CreateAnotherButton.svelte';
	import CreateCopyButton from '$lib/components/CreateCopyButton.svelte';
	import CreateTemplateButton from '$lib/components/CreateTemplateButton.svelte';
	import DropDownMenu from '$lib/components/DropDownMenu.svelte';
	import EditableChapter from '$lib/components/EditableChapter.svelte';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import Header from '$lib/components/Header.svelte';
	import KnowledgeAIButton from '$lib/components/KnowledgeAIButton.svelte';
	import ProgramProperties from '$lib/components/ProgramProperties.svelte';
	import RelationButton from '$lib/components/RelationButton.svelte';
	import SettingsDropdown from '$lib/components/SettingsDropdown.svelte';
	import { createFeatureDecisions } from '$lib/features';
	import {
		type AnyPayload,
		computeFacetCount,
		type Container,
		containerOfType,
		type NewContainer,
		paramsFromFragment,
		type PayloadType,
		payloadTypes,
		predicates,
		type ProgramPayload,
		programTypes,
		status
	} from '$lib/models';
	import { ability, applicationState, newContainer } from '$lib/stores';
	import { extractCustomCategoryFiltersFromParams } from '$lib/utils/customCategoryFilters';

	interface Props {
		container: Container<ProgramPayload>;
		layout: Snippet<[Snippet, Snippet]>;
		revisions: Container<AnyPayload>[];
	}

	let { container = $bindable(), layout, revisions }: Props = $props();

	const templateAvailability = createScopedTemplateAvailability({
		active: () => $applicationState.containerDetailView.editable,
		candidateTypes: () => container.payload.chapterType,
		organizationGuid: () => container.organization,
		scopeGuid: () => container.guid
	});
	let availableChapterTypes = $derived(
		container.payload.chapterType.filter(
			(type) => type === payloadTypes.enum.text || templateAvailability.has(type)
		)
	);

	let guid = $derived(container.guid);

	let categoryContext = $derived(page.data.categoryContext);
	let relatedContainersQuery = resource(
		[() => guid, () => paramsFromFragment(page.url).toString()],
		async ([guid, urlHash], _, { signal }) => {
			const hashParams = new URLSearchParams(urlHash);
			const terms = hashParams.get('terms') ?? '';
			const statuses = hashParams.getAll('status');
			const customCategories = extractCustomCategoryFiltersFromParams(
				hashParams,
				categoryContext.keys
			);
			return fetchRelatedContainers(guid, { terms, statuses, ...customCategories }, 'alpha', {
				signal
			});
		}
	);

	let relatedContainers = $derived(relatedContainersQuery.current ?? []);

	let parts = $state([]) as Container[];

	let filteredParts = $derived(
		parts.filter(({ payload }) => byPayloadType(payload.type, page.url))
	);

	let relatedParts = $derived(
		relatedContainersQuery.current?.filter(({ guid, relation }) =>
			relation.some(
				({ object, predicate }) =>
					predicate === predicates.enum['is-part-of-program'] &&
					object === container.guid &&
					guid !== container.guid
			)
		) ?? []
	);

	let facets = $derived(
		computeFacetCount(
			new Map([
				['status', new Map(status.options.map((s) => [s, 0]))],
				...buildCategoryFacetsWithCounts(categoryContext.options),
				['type', new Map(container.payload.chapterType.map((v) => [v as string, 0]))]
			]),
			relatedParts
		)
	);

	let overlay = getContext('overlay');

	$effect(() => {
		const containers = relatedContainersQuery.current;
		if (containers) {
			const filtered = containers.filter(({ guid, relation }) =>
				relation.some(
					({ object, predicate }) =>
						predicate === predicates.enum['is-part-of-program'] &&
						object === container.guid &&
						guid != container.guid
				)
			);

			for (const part of filtered) {
				if ('category' in part.payload) {
					for (const key of categoryContext.keys) {
						if (!part.payload.category[key]) {
							part.payload.category[key] = [];
						}
					}
				}
			}

			parts = filtered;
		}
	});

	function byPayloadType(payloadType: PayloadType, url: URL) {
		const params = overlay ? paramsFromFragment(url) : page.url.searchParams;
		return !params.has('type') || params.getAll('type').includes(payloadType);
	}

	const createContainerDialog = getContext<{ getElement: () => HTMLDialogElement }>(
		'createContainerDialog'
	);

	function createContainer(event: Event) {
		if (!(event as CustomEvent).detail.selected) {
			return;
		}

		const chapter = containerOfType(
			(event as CustomEvent).detail.selected as PayloadType,
			container
		) as NewContainer;

		chapter.relation = [
			{ object: container.guid, predicate: predicates.enum['is-part-of-program'], position: 0 }
		];

		$newContainer = chapter;

		createContainerDialog.getElement().showModal();
	}

	function stopPropagation(fn: (event: Event) => void) {
		return function (this: Event, event: Event) {
			event.stopPropagation();
			fn.call(this, event);
		};
	}
</script>

{#snippet footer()}
	<footer class="footer-action-bar">
		<RelationButton {container} />
		<AdoptButton {container} />
		<CreateAnotherButton {container} {relatedContainers} {templateAvailability} />
		<CreateCopyButton {container} />
		<CreateTemplateButton {container} />
		{#if [programTypes.enum['program_type.guide'], programTypes.enum['program_type.publication']].some((t) => t == container.payload.programType) && createFeatureDecisions(page.data.features).useMistral()}
			<KnowledgeAIButton {container} />
		{:else if createFeatureDecisions(page.data.features).useOpenAI()}
			<AskAIButton {container} />
		{/if}
	</footer>
{/snippet}

{#snippet header()}
	<Header {facets} search>
		{#snippet settings()}
			<SettingsDropdown {container} {relatedContainers} />
		{/snippet}
	</Header>
{/snippet}

{#snippet main()}
	<EditableContainerDetailView bind:container {footer} {relatedContainers} {revisions}>
		{#snippet data()}
			<div class="chapters">
				{#each filteredParts as part, i (part.guid)}
					<form
						class="details-section"
						oninput={stopPropagation(requestSubmit)}
						onsubmit={autoSave(part, 2000)}
						novalidate
					>
						<!-- eslint-disable-next-line svelte/no-unused-svelte-ignore -->
						<!-- svelte-ignore binding_property_non_reactive -->
						<EditableChapter
							{availableChapterTypes}
							bind:container={filteredParts[i]}
							editable={$applicationState.containerDetailView.editable &&
								$ability.can('update', part)}
							isPartOf={container}
							{relatedContainers}
						/>
					</form>
				{:else}
					{#if $applicationState.containerDetailView.editable && availableChapterTypes.some( (t) => $ability.can('create', containerOfType(t, container)) )}
						<div class="details-section">
							<DropDownMenu
								handleChange={createContainer}
								label={$_('chapter')}
								options={availableChapterTypes.map((t) => ({ label: $_(t), value: t }))}
							>
								{#snippet icon()}<Plus />{/snippet}
							</DropDownMenu>
						</div>
					{/if}
				{/each}
			</div>
		{/snippet}

		{#snippet properties()}
			<ProgramProperties
				bind:container
				editable={$applicationState.containerDetailView.editable &&
					$ability.can('update', container)}
				{relatedContainers}
				{revisions}
			/>
		{/snippet}
	</EditableContainerDetailView>
{/snippet}

{@render layout(header, main)}

<style>
	.chapters :global(.dropdown-button.dropdown-button--menu) {
		--dropdown-button-border-radius: 8px;
		--dropdown-button-border-width: 1px;
		--dropdown-button-icon-size: 1rem;
	}

	.details-section {
		--details-section-padding-y: 1.5rem;
	}
</style>
