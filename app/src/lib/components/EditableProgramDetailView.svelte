<script lang="ts">
	import { resource } from 'runed';
	import { getContext, type Snippet } from 'svelte';
	import { page } from '$app/state';
	import { buildCategoryFacetsWithCounts } from '$lib/categoryOptions';
	import createScopedTemplateAvailability from '$lib/client/createScopedTemplateAvailability.svelte';
	import fetchRelatedContainers from '$lib/client/fetchRelatedContainers';
	import withOptimistic from '$lib/client/withOptimistic';
	import AdoptButton from '$lib/components/AdoptButton.svelte';
	import AskAIButton from '$lib/components/AskAIButton.svelte';
	import CreateAnotherButton from '$lib/components/CreateAnotherButton.svelte';
	import CreateCopyButton from '$lib/components/CreateCopyButton.svelte';
	import CreateTemplateButton from '$lib/components/CreateTemplateButton.svelte';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import Header from '$lib/components/Header.svelte';
	import KnowledgeAIButton from '$lib/components/KnowledgeAIButton.svelte';
	import ProgramProperties from '$lib/components/ProgramProperties.svelte';
	import RelationButton from '$lib/components/RelationButton.svelte';
	import Sections from '$lib/components/Sections.svelte';
	import SettingsDropdown from '$lib/components/SettingsDropdown.svelte';
	import { createFeatureDecisions } from '$lib/features';
	import {
		type AnyPayload,
		computeFacetCount,
		type Container,
		isObjectCollectionContainer,
		paramsFromFragment,
		predicates,
		type ProgramPayload,
		programTypes,
		status
	} from '$lib/models';
	import { hasSection } from '$lib/relations';
	import {
		hasActiveItemFilters,
		itemFiltersFromParams,
		matchesItemFilters,
		sectionGroupOf,
		sectionGroups
	} from '$lib/sectionFilters';
	import {
		ability,
		applicationState,
		lastCreatedContainers,
		lastDeletedContainers,
		lastUpdatedContainers
	} from '$lib/stores';

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

	let guid = $derived(container.guid);

	let overlay = getContext('overlay');

	let categoryContext = $derived(page.data.categoryContext);

	// Everything related to the program is loaded once; the filters below work on the client.
	let relatedContainersQuery = resource([() => guid], async ([guid], _, { signal }) =>
		fetchRelatedContainers(guid, {}, 'alpha', { signal })
	);

	let relatedContainers = $derived(
		withOptimistic(
			relatedContainersQuery.current ?? [],
			$lastCreatedContainers,
			$lastDeletedContainers,
			$lastUpdatedContainers,
			(created) =>
				created.relation.some(
					({ object, predicate }) =>
						object === guid &&
						(predicate === predicates.enum['is-section-of'] ||
							predicate === predicates.enum['is-part-of-program'])
				)
		)
	);

	let sections = $derived(hasSection(container, relatedContainers));

	let objectSections = $derived(sections.filter(isObjectCollectionContainer));

	let sectionItems = $derived(
		objectSections
			.flatMap(({ payload }) => payload.item)
			.map((itemGuid) => relatedContainers.find((c) => c.guid === itemGuid))
			.filter((c): c is Container => c !== undefined)
	);

	let params = $derived(overlay ? paramsFromFragment(page.url) : page.url.searchParams);

	let selectedGroups = $derived(params.getAll('section'));

	let itemFilters = $derived(itemFiltersFromParams(params, categoryContext.keys));

	let itemFilterActive = $derived(hasActiveItemFilters(itemFilters));

	let itemFilter = $derived(
		itemFilterActive
			? (item: Container<AnyPayload>) => matchesItemFilters(item, itemFilters)
			: undefined
	);

	// Object sections are filtered by the kind and content of their objects, every
	// other section only by the "other" group.
	let sectionFilter = $derived(
		itemFilterActive || selectedGroups.length > 0
			? (section: Container) => {
					if (isObjectCollectionContainer(section)) {
						if (
							selectedGroups.length > 0 &&
							!selectedGroups.includes(sectionGroupOf(section.payload.objectType))
						) {
							return false;
						}
						return (
							!itemFilterActive ||
							section.payload.item.some((itemGuid) => {
								const item = relatedContainers.find((c) => c.guid === itemGuid);
								return item !== undefined && matchesItemFilters(item, itemFilters);
							})
						);
					}
					return selectedGroups.length === 0 || selectedGroups.includes(sectionGroups.enum.other);
				}
			: undefined
	);

	let facets = $derived.by(() => {
		const sectionCounts = new Map<string, number>(sectionGroups.options.map((g) => [g, 0]));
		for (const section of objectSections) {
			const group = sectionGroupOf(section.payload.objectType);
			sectionCounts.set(group, (sectionCounts.get(group) ?? 0) + section.payload.item.length);
		}
		sectionCounts.set(sectionGroups.enum.other, sections.length - objectSections.length);
		return computeFacetCount(
			new Map([
				['section', sectionCounts],
				['status', new Map(status.options.map((s) => [s, 0]))],
				...buildCategoryFacetsWithCounts(categoryContext.options)
			]),
			sectionItems
		);
	});
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
	<EditableContainerDetailView bind:container {footer}>
		{#snippet data()}
			<Sections bind:container {itemFilter} {relatedContainers} {sectionFilter} />
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
