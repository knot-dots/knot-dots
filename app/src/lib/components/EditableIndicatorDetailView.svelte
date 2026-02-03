<script lang="ts">
	import type { Snippet } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import paramsFromURL from '$lib/client/paramsFromURL';
	import CreateCopyButton from '$lib/components/CreateCopyButton.svelte';
	import CreateOverallObjectiveButton from '$lib/components/CreateOverallObjectiveButton.svelte';
	import Card from '$lib/components/Card.svelte';
	import DeleteButton from '$lib/components/DeleteButton.svelte';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import EditableHistoricalValues from '$lib/components/EditableHistoricalValues.svelte';
	import Header from '$lib/components/Header.svelte';
	import IndicatorTable from '$lib/components/IndicatorTable.svelte';
	import { type IndicatorTab, tab } from '$lib/components/IndicatorTabs.svelte';
	import IndicatorChart from '$lib/components/IndicatorChart.svelte';
	import IndicatorProperties from '$lib/components/IndicatorProperties.svelte';
	import RelationButton from '$lib/components/RelationButton.svelte';
	import SaveAsIndicatorTemplateButton from '$lib/components/SaveAsIndicatorTemplateButton.svelte';
	import {
		type AnyContainer,
		titleForProgramCollection,
		findOverallObjective,
		type IndicatorContainer,
		isContainerWithEffect,
		isContainerWithObjective,
		isObjectiveContainer,
		isProgramContainer,
		isRelatedTo,
		paramsFromFragment
	} from '$lib/models';
	import { fetchContainersRelatedToIndicators } from '$lib/remote/data.remote';
	import { ability, applicationState } from '$lib/stores';

	interface Props {
		container: IndicatorContainer;
		layout: Snippet<[Snippet, Snippet]>;
		revisions: AnyContainer[];
	}

	let { container = $bindable(), layout, revisions }: Props = $props();

	let guid = $derived(container.guid);

	let organization = $derived(container.organization);

	let relatedContainersQuery = $derived(
		fetchContainersRelatedToIndicators({
			guid,
			params: {
				organization: [organization],
				...(page.data.currentOrganizationalUnit
					? { organizationalUnit: page.data.currentOrganizationalUnit.guid }
					: undefined),
				...(paramsFromFragment(page.url).has('program')
					? { program: paramsFromFragment(page.url).get('program') as string }
					: undefined)
			}
		})
	);

	let relatedContainers = $derived(relatedContainersQuery.current ?? []);

	let currentTab: IndicatorTab = $derived.by(() => {
		const parseResult = tab.safeParse(paramsFromURL(page.url).get('tab'));
		if (parseResult.success) {
			return parseResult.data;
		} else {
			return tab.enum.all;
		}
	});

	let showEffects = $derived(currentTab == tab.enum.measures || currentTab == tab.enum.all);

	let showObjectives = $derived(currentTab == tab.enum.objectives || currentTab == tab.enum.all);

	let viewMode = $state('chart');

	function tabURL(params: URLSearchParams, tab: IndicatorTab) {
		const query = new URLSearchParams(params);
		query.set('tab', tab);
		return `#${query.toString()}`;
	}

	let overallObjective = $derived(findOverallObjective(container, relatedContainers));
</script>

{#snippet header()}
	<Header sortOptions={[]} workspaceOptions={[]} />
{/snippet}

{#snippet main()}
	<EditableContainerDetailView bind:container>
		{#snippet data()}
			<IndicatorProperties
				bind:container
				editable={$applicationState.containerDetailView.editable &&
					$ability.can('update', container)}
				{relatedContainers}
				{revisions}
			/>

			<div class="details-section">
				<ul class="button-group">
					{#each tab.options as option (option)}
						<li class:is-active={option === currentTab}>
							<a class="button" href={tabURL(paramsFromFragment(page.url), option)}>
								{$_(`indicator.tab.${option}`)}
							</a>
						</li>
					{/each}
				</ul>

				<select class="view-mode" bind:value={viewMode}>
					<option value="chart">{$_('indicator.view_mode.chart')}</option>
					<option value="table">{$_('indicator.view_mode.table')}</option>
				</select>

				{#if $applicationState.containerDetailView.editable && $ability.can('update', container)}
					<EditableHistoricalValues editable bind:container />
				{/if}

				{#if viewMode === 'chart'}
					<IndicatorChart
						{container}
						{relatedContainers}
						{showEffects}
						{showObjectives}
						showLegend
					/>
				{:else if viewMode === 'table'}
					<IndicatorTable {container} {relatedContainers} {showEffects} {showObjectives} />
				{/if}
			</div>

			{#if showEffects}
				<div class="details-section">
					<h2 class="details-heading">{$_('measures')}</h2>
					<ul class="carousel">
						{#each relatedContainers.filter( (c) => isContainerWithEffect(c) ) as measure (measure.guid)}
							<li>
								<Card container={measure} />
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			{#if showObjectives}
				<div class="details-section">
					<h2 class="details-heading">{$_('goals')}</h2>
					<ul class="carousel">
						{#if overallObjective}
							<li>
								<Card container={overallObjective} />
							</li>
						{/if}
						{#each relatedContainers.filter(isObjectiveContainer) as objective (objective.guid)}
							{@const goal = relatedContainers
								.filter(isContainerWithObjective)
								.find(isRelatedTo(objective))}
							{#if goal}
								<li>
									<Card container={goal} />
								</li>
							{/if}
						{/each}
					</ul>
				</div>
			{/if}

			<div class="details-section">
				<h2 class="details-heading">
					{titleForProgramCollection(relatedContainers.filter(isProgramContainer))}
				</h2>
				<ul class="carousel">
					{#each relatedContainers.filter(isProgramContainer) as program (program.guid)}
						<li>
							<Card container={program} />
						</li>
					{/each}
				</ul>
			</div>

			{#key container.guid}
				<EditableFormattedText
					editable={$applicationState.containerDetailView.editable &&
						$ability.can('update', container)}
					label={$_('description')}
					bind:value={container.payload.description}
				/>
			{/key}
		{/snippet}
	</EditableContainerDetailView>

	<footer class="content-footer bottom-actions-bar">
		<div class="content-actions">
			<CreateOverallObjectiveButton {container} {relatedContainers} />
			<SaveAsIndicatorTemplateButton {container} />
			<RelationButton {container} />
			<CreateCopyButton {container} />
			<DeleteButton {container} {relatedContainers} />
		</div>
	</footer>
{/snippet}

{@render layout(header, main)}

<style>
	select {
		border: none;
		box-shadow: var(--shadow-sm);
		margin: 1.75rem 0 1rem;
	}

	.button-group {
		--button-active-background: var(--color-gray-200);
		--button-border-color: var(--color-gray-200);
		--button-hover-background: var(--color-gray-050);

		background: white;
		border-radius: 6px 0 0 6px;

		color: var(--color-gray-900);
		font-size: 0.875rem;
		margin-bottom: 1rem;
	}

	.button-group > .is-active {
		--button-border-color: var(--color-primary-700);

		color: var(--color-primary-700);
	}

	.button-group > .is-active + li {
		border-left: 1px solid var(--color-primary-700);
	}

	.button-group .button {
		--padding-x: 1rem;
		--padding-y: 0.5rem;
	}

	.view-mode {
		width: fit-content;
	}
</style>
