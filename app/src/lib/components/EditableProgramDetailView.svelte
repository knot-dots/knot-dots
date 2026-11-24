<script lang="ts">
	import { resource } from 'runed';
	import { getContext, type Snippet } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { page } from '$app/state';
	import { buildCategoryFacetsWithCounts } from '$lib/categoryOptions';
	import fetchRelatedContainers from '$lib/client/fetchRelatedContainers';
	import AdoptButton from '$lib/components/AdoptButton.svelte';
	import AskAIButton from '$lib/components/AskAIButton.svelte';
	import CreateCopyButton from '$lib/components/CreateCopyButton.svelte';
	import CreateTemplateButton from '$lib/components/CreateTemplateButton.svelte';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import Header from '$lib/components/Header.svelte';
	import KnowledgeAIButton from '$lib/components/KnowledgeAIButton.svelte';
	import RelationButton from '$lib/components/RelationButton.svelte';
	import Sections from '$lib/components/Sections.svelte';
	import SettingsDropdown from '$lib/components/SettingsDropdown.svelte';
	import { setBulkActionContext } from '$lib/contexts/bulkAction';
	import { createFeatureDecisions } from '$lib/features';
	import {
		type AnyPayload,
		computeFacetCount,
		type Container,
		paramsFromFragment,
		type PayloadType,
		predicates,
		type ProgramPayload,
		programTypes,
		status
	} from '$lib/models';
	import { extractCustomCategoryFiltersFromParams } from '$lib/utils/customCategoryFilters';

	interface Props {
		container: Container<ProgramPayload>;
		layout: Snippet<[Snippet, Snippet]>;
		revisions: Container<AnyPayload>[];
	}

	let { container = $bindable(), layout, revisions }: Props = $props();

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

	let relatedContainers = $derived(
		relatedContainersQuery.current?.filter(({ payload }) =>
			byPayloadType(payload.type, page.url)
		) ?? []
	);

	let sections = $derived(
		relatedContainersQuery.current?.filter(({ guid, relation }) =>
			relation.some(
				({ object, predicate }) =>
					predicate === predicates.enum['is-section-of'] &&
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
				['type', new Map(sections.map(({ payload }) => payload.type).map((v) => [v as string, 0]))]
			]),
			sections
		)
	);

	let overlay = getContext('overlay');

	function byPayloadType(payloadType: PayloadType, url: URL) {
		const params = overlay ? paramsFromFragment(url) : page.url.searchParams;
		return !params.has('type') || params.getAll('type').includes(payloadType);
	}

	setBulkActionContext({
		actions: ['visibility', 'delete'],
		onSuccess: relatedContainersQuery.refetch,
		selected: new SvelteSet<string>()
	});
</script>

{#snippet footer()}
	<footer class="footer-action-bar">
		<RelationButton {container} />
		<AdoptButton {container} />
		<CreateCopyButton {container} />
		<CreateTemplateButton {container} />
		{#if [programTypes.enum['program_type.guide'], programTypes.enum['program_type.publication']].some((t) => t == container.payload.programType) && createFeatureDecisions(page.data.features).useMistral()}
			<KnowledgeAIButton {container} {relatedContainersQuery} />
		{:else if createFeatureDecisions(page.data.features).useOpenAI()}
			<AskAIButton {container} {relatedContainersQuery} />
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
			{const filterActive = $derived(
				[paramsFromFragment(page.url), page.url.searchParams].some((params) =>
					['type', 'terms', 'status', ...categoryContext.keys].some((key) => params.has(key))
				)
			)}
			<Sections bind:container {relatedContainers} sortable={!filterActive} />
		{/snippet}
	</EditableContainerDetailView>
{/snippet}

{@render layout(header, main)}
