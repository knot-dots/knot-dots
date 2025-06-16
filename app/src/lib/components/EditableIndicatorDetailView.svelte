<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import paramsFromURL from '$lib/client/paramsFromURL';
	import AuthoredBy from '$lib/components/AuthoredBy.svelte';
	import Card from '$lib/components/Card.svelte';
	import EditableAudience from '$lib/components/EditableAudience.svelte';
	import EditableCategory from '$lib/components/EditableCategory.svelte';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableEditorialState from '$lib/components/EditableEditorialState.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import EditableHistoricalValues from '$lib/components/EditableHistoricalValues.svelte';
	import EditableIndicatorCategory from '$lib/components/EditableIndicatorCategory.svelte';
	import EditableIndicatorType from '$lib/components/EditableIndicatorType.svelte';
	import EditableIndicatorUnit from '$lib/components/EditableIndicatorUnit.svelte';
	import EditableOrganization from '$lib/components/EditableOrganization.svelte';
	import EditableOrganizationalUnit from '$lib/components/EditableOrganizationalUnit.svelte';
	import EditablePolicyFieldBNK from '$lib/components/EditablePolicyFieldBNK.svelte';
	import EditableVisibility from '$lib/components/EditableVisibility.svelte';
	import EditableTopic from '$lib/components/EditableTopic.svelte';
	import type { IndicatorTab } from '$lib/components/IndicatorTabs.svelte';
	import IndicatorTable from '$lib/components/IndicatorTable.svelte';
	import IndicatorChart from '$lib/components/IndicatorChart.svelte';
	import ManagedBy from '$lib/components/ManagedBy.svelte';
	import PropertyGrid from '$lib/components/PropertyGrid.svelte';
	import {
		type AnyContainer,
		type Container,
		findOverallObjective,
		type IndicatorContainer,
		isContainerWithEffect,
		isContainerWithObjective,
		isObjectiveContainer,
		isRelatedTo,
		isStrategyContainer,
		paramsFromFragment
	} from '$lib/models';
	import { ability, applicationState } from '$lib/stores';
	import { tab } from './IndicatorTabs.svelte';

	interface Props {
		container: IndicatorContainer;
		relatedContainers: Container[];
		revisions: AnyContainer[];
	}

	let { container = $bindable(), relatedContainers, revisions }: Props = $props();

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

<EditableContainerDetailView bind:container {relatedContainers} {revisions}>
	{#snippet data()}
		<PropertyGrid>
			{#snippet top()}
				<EditableIndicatorType
					editable={$applicationState.containerDetailView.editable}
					bind:value={container.payload.indicatorType}
				/>

				<EditableIndicatorUnit
					editable={$applicationState.containerDetailView.editable}
					bind:value={container.payload.unit}
				/>

				{#if $ability.can('update', container, 'indicatorCategory')}
					<EditableIndicatorCategory
						editable={$applicationState.containerDetailView.editable}
						bind:value={container.payload.indicatorCategory}
					/>
				{/if}
			{/snippet}

			{#snippet bottom()}
				<EditableIndicatorType
					editable={$applicationState.containerDetailView.editable}
					bind:value={container.payload.indicatorType}
				/>

				<EditableIndicatorUnit
					editable={$applicationState.containerDetailView.editable}
					bind:value={container.payload.unit}
				/>

				{#if $ability.can('update', container, 'indicatorCategory')}
					<EditableIndicatorCategory
						editable={$applicationState.containerDetailView.editable}
						bind:value={container.payload.indicatorCategory}
					/>
				{/if}

				{#if $ability.can('read', container, 'payload.editorialState')}
					<EditableEditorialState
						aiSuggestion={container.payload.aiSuggestion}
						editable={$applicationState.containerDetailView.editable &&
							$ability.can('update', container, 'payload.editorialState')}
						bind:value={container.payload.editorialState}
					/>
				{/if}

				{#if $ability.can('update', container, 'visibility')}
					<EditableVisibility
						editable={$applicationState.containerDetailView.editable}
						bind:value={container.payload.visibility}
					/>
				{/if}

				<EditableCategory
					editable={$applicationState.containerDetailView.editable}
					bind:value={container.payload.category}
				/>

				<EditableTopic
					editable={$applicationState.containerDetailView.editable}
					bind:value={container.payload.topic}
				/>

				<EditablePolicyFieldBNK
					editable={$applicationState.containerDetailView.editable}
					bind:value={container.payload.policyFieldBNK}
				/>

				<EditableAudience
					editable={$applicationState.containerDetailView.editable}
					bind:value={container.payload.audience}
				/>

				<ManagedBy {container} {relatedContainers} />

				<EditableOrganizationalUnit
					editable={$applicationState.containerDetailView.editable &&
						$ability.can('update', container.payload.type, 'organizational_unit')}
					organization={container.organization}
					bind:value={container.organizational_unit}
				/>

				<EditableOrganization
					editable={$applicationState.containerDetailView.editable &&
						$ability.can('update', container.payload.type, 'organization')}
					bind:value={container.organization}
				/>

				<AuthoredBy {container} {revisions} />
			{/snippet}
		</PropertyGrid>

		<div class="details-tab">
			<ul class="button-group">
				{#each tab.options as option}
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

			{#if $applicationState.containerDetailView.editable}
				<EditableHistoricalValues editable bind:container />
			{/if}

			{#if viewMode === 'chart'}
				<IndicatorChart {container} {relatedContainers} {showEffects} {showObjectives} showLegend />
			{:else if viewMode === 'table'}
				<IndicatorTable {container} {relatedContainers} {showEffects} {showObjectives} />
			{/if}
		</div>

		{#if showEffects}
			<div class="details-tab" id="measures">
				<h3>{$_('measures')}</h3>
				<ul class="carousel">
					{#each relatedContainers.filter((c) => isContainerWithEffect(c)) as measure}
						<li>
							<Card container={measure} />
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		{#if showObjectives}
			<div class="details-tab" id="goals">
				<h3>{$_('goals')}</h3>
				<ul class="carousel">
					{#if overallObjective}
						<li>
							<Card container={overallObjective} />
						</li>
					{/if}
					{#each relatedContainers.filter(isObjectiveContainer) as objective}
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

		<div class="details-tab" id="strategies">
			<h3>{$_('strategies')}</h3>
			<ul class="carousel">
				{#each relatedContainers.filter(isStrategyContainer) as strategy}
					<li>
						<Card container={strategy} />
					</li>
				{/each}
			</ul>
		</div>

		{#key container.guid}
			<EditableFormattedText
				editable={$applicationState.containerDetailView.editable}
				label={$_('description')}
				bind:value={container.payload.description}
			/>
		{/key}
	{/snippet}
</EditableContainerDetailView>

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
