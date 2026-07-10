<script lang="ts">
	import { getContext, type Snippet } from 'svelte';
	import { flip } from 'svelte/animate';
	import { type DndEvent, dragHandleZone } from 'svelte-dnd-action';
	import { _ } from 'svelte-i18n';
	import Plus from '~icons/knotdots/plus';
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import { buildCategoryFacetsWithCounts } from '$lib/categoryOptions';
	import autoSave from '$lib/client/autoSave';
	import requestSubmit from '$lib/client/requestSubmit';
	import AskAIButton from '$lib/components/AskAIButton.svelte';
	import CreateAnotherButton from '$lib/components/CreateAnotherButton.svelte';
	import CreateCopyButton from '$lib/components/CreateCopyButton.svelte';
	import DeleteButton from '$lib/components/DeleteButton.svelte';
	import DropDownMenu from '$lib/components/DropDownMenu.svelte';
	import EditableChapter from '$lib/components/EditableChapter.svelte';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableRow from '$lib/components/EditableRow.svelte';
	import Header from '$lib/components/Header.svelte';
	import KnowledgeAIButton from '$lib/components/KnowledgeAIButton.svelte';
	import ProgramProperties from '$lib/components/ProgramProperties.svelte';
	import RelationButton from '$lib/components/RelationButton.svelte';
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
		type ProgramContainer,
		programTypes,
		status
	} from '$lib/models';
	import fetchRelatedContainers from '$lib/client/fetchRelatedContainers';
	import { resource } from 'runed';
	import { ability, applicationState, newContainer } from '$lib/stores';
	import { extractCustomCategoryFiltersFromParams } from '$lib/utils/customCategoryFilters';

	interface Props {
		container: ProgramContainer;
		layout: Snippet<[Snippet, Snippet]>;
		revisions: Container<AnyPayload>[];
	}

	let { container = $bindable(), layout, revisions }: Props = $props();

	let guid = $derived(container.guid);

	let isGuide = $derived(container.payload.programType === programTypes.enum['program_type.guide']);

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
				({ predicate }) =>
					predicate === predicates.enum['is-part-of-program'] && guid !== container.guid
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

	let customCategoryColumn = $derived(categoryContext.keys.filter((key) => facets.has(key)));

	let viewMode = $derived(
		paramsFromFragment(page.url).has('table') ? 'view_mode.table' : 'view_mode.preview'
	);

	let overlay = getContext('overlay');

	$effect(() => {
		const containers = relatedContainersQuery.current;
		if (containers) {
			const filtered = containers.filter(({ guid, relation }) =>
				relation.some(
					({ predicate }) =>
						predicate === predicates.enum['is-part-of-program'] && guid != container.guid
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

	function handleDndConsider(event: CustomEvent<DndEvent<Container>>) {
		parts = event.detail.items;
	}

	async function handleDndFinalize(event: CustomEvent<DndEvent<Container>>) {
		parts = event.detail.items;
		container.relation = [
			...parts.map(({ guid }, index) => ({
				object: container.guid,
				position: index,
				predicate: predicates.enum['is-part-of-program'],
				subject: guid
			})),
			...container.relation.filter(
				({ predicate }) => predicate !== predicates.enum['is-part-of-program']
			)
		];

		const url = `/container/${container.guid}/relation`;
		await fetch(url, {
			method: 'POST',
			body: JSON.stringify(container.relation),
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json'
			}
		});

		await relatedContainersQuery.refetch();
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
			container.organization,
			container.organizational_unit,
			container.managed_by,
			env.PUBLIC_KC_REALM as string
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

{#snippet row(parts: Container[], dragEnabled: boolean)}
	{#each parts as part, i (part.guid)}
		<form
			animate:flip={{ duration: 100 }}
			class="row"
			oninput={requestSubmit}
			onsubmit={autoSave(part, 2000)}
			novalidate
			role="row"
		>
			<!-- eslint-disable-next-line svelte/no-unused-svelte-ignore -->
			<!-- svelte-ignore binding_property_non_reactive -->
			<EditableRow
				columns={[
					'action',
					'title',
					'type',
					'aiContribution',
					...(isGuide ? ['aiSuggestionPageReference'] : []),
					'description',
					'visibility',
					'status',
					...customCategoryColumn,
					'fulfillmentDate',
					'duration',
					'editorialState',
					'organizationalUnit',
					'hierarchyLevel',
					'objectType'
				]}
				bind:container={parts[i]}
				{dragEnabled}
				editable={$applicationState.containerDetailView.editable}
			/>
		</form>
	{/each}
{/snippet}

{#snippet header()}
	<Header {facets} search />
{/snippet}

{#snippet main()}
	{#if viewMode === 'view_mode.preview'}
		<EditableContainerDetailView bind:container>
			{#snippet data()}
				<ProgramProperties
					bind:container
					editable={$applicationState.containerDetailView.editable &&
						$ability.can('update', container)}
					{relatedContainers}
					{revisions}
				/>

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
								bind:container={filteredParts[i]}
								editable={$applicationState.containerDetailView.editable &&
									$ability.can('update', part)}
								isPartOf={container}
								{relatedContainers}
							/>
						</form>
					{:else}
						{#if $ability.can('create', containerOfType(payloadTypes.enum.undefined, page.data.currentOrganization.guid, page.data.currentOrganizationalUnit?.guid ?? null, container.managed_by, env.PUBLIC_KC_REALM))}
							<DropDownMenu
								handleChange={createContainer}
								label={$_('chapter')}
								options={container.payload.chapterType.map((t) => ({ label: $_(t), value: t }))}
							>
								{#snippet icon()}<Plus />{/snippet}
							</DropDownMenu>
						{/if}
					{/each}
				</div>
			{/snippet}
		</EditableContainerDetailView>
	{:else if viewMode === 'view_mode.table'}
		<div class="table-wrapper table-wrapper--with-end-padding">
			<div class="table" role="table">
				<div class="table-head" role="rowgroup">
					<div class="row">
						<div class="cell cell--action" role="columnheader"></div>
						<div class="cell" role="columnheader">{$_('title')}</div>
						<div class="cell" role="columnheader">{$_('object')}</div>
						<div class="cell" role="columnheader">{$_('ai_contribution')}</div>
						{#if isGuide}
							<div class="cell" role="columnheader">{$_('page')}</div>
						{/if}
						<div class="cell" role="columnheader">{$_('description')}</div>
						<div class="cell" role="columnheader">{$_('visibility.label')}</div>
						<div class="cell" role="columnheader">{$_('status')}</div>
						{#each customCategoryColumn as key (key)}
							<div class="cell" role="columnheader">{categoryContext.labels.get(key) ?? key}</div>
						{/each}
						<div class="cell" role="columnheader">{$_('fulfillment_date')}</div>
						<div class="cell" role="columnheader">{$_('planned_duration')}</div>
						<div class="cell" role="columnheader">{$_('editorial_state')}</div>
						<div class="cell" role="columnheader">{$_('organizational_unit')}</div>
						<div class="cell" role="columnheader">{$_('goal.hierarchy_level')}</div>
						<div class="cell" role="columnheader">{$_('goal_type')}</div>
					</div>
				</div>
				{#if $ability.cannot('update', container) || paramsFromFragment(page.url).has('type')}
					<div class="table-body" role="rowgroup">
						{@render row(filteredParts, false)}
					</div>
				{:else}
					<div
						class="table-body"
						onconsider={handleDndConsider}
						onfinalize={handleDndFinalize}
						role="rowgroup"
						use:dragHandleZone={{
							autoAriaDisabled: true,
							dropTargetStyle: {},
							items: filteredParts,
							flipDurationMs: 100,
							useCursorForDetection: true
						}}
					>
						{@render row(filteredParts, true)}
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<footer class="content-footer bottom-actions-bar">
		<div class="content-actions">
			<RelationButton {container} />
			<CreateAnotherButton {container} {relatedContainers} />
			<CreateCopyButton {container} />
			{#if [programTypes.enum['program_type.guide'], programTypes.enum['program_type.publication']].some((t) => t == container.payload.programType) && createFeatureDecisions(page.data.features).useMistral()}
				<KnowledgeAIButton {container} />
			{:else if createFeatureDecisions(page.data.features).useOpenAI()}
				<AskAIButton {container} />
			{/if}
			<DeleteButton {container} {relatedContainers} />
		</div>
	</footer>
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

	.table-wrapper {
		container-type: inline-size;
		height: 100%;
	}

	.table {
		width: fit-content;
	}

	.table-head .cell {
		white-space: nowrap;
	}
</style>
