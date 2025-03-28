<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import paramsFromURL from '$lib/client/paramsFromURL';
	import { tab } from './IndicatorTabs.svelte';
	import Card from '$lib/components/Card.svelte';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import IndicatorTable from '$lib/components/IndicatorTable.svelte';
	import type { IndicatorTab } from '$lib/components/IndicatorTabs.svelte';
	import IndicatorChart from '$lib/components/IndicatorChart.svelte';
	import {
		type AnyContainer,
		type Container,
		findOverallObjective,
		type IndicatorContainer,
		isContainerWithEffect,
		isContainerWithObjective,
		isStrategyContainer,
		type ObjectiveContainer
	} from '$lib/models';
	import { applicationState } from '$lib/stores';

	export let container: IndicatorContainer;
	export let relatedContainers: Container[];
	export let revisions: AnyContainer[];

	let currentTab: IndicatorTab = tab.enum.all;
	let showEffects = true;
	let showObjectives = true;
	let viewMode = 'chart';
	let overallObjective: ObjectiveContainer | undefined;

	$: {
		const parseResult = tab.safeParse(paramsFromURL($page.url).get('tab'));
		if (parseResult.success) {
			currentTab = parseResult.data;
		}

		if (currentTab == tab.enum.historical_values) {
			showEffects = false;
			showObjectives = false;
		} else if (currentTab == tab.enum.objectives) {
			showEffects = false;
			showObjectives = true;
		} else if (currentTab == tab.enum.measures) {
			showEffects = true;
			showObjectives = false;
		} else {
			showEffects = true;
			showObjectives = true;
		}
	}

	$: {
		overallObjective = findOverallObjective(container, relatedContainers);
	}
</script>

<EditableContainerDetailView {container} {relatedContainers} {revisions}>
	<svelte:fragment slot="data">
		<select class="view-mode" bind:value={viewMode}>
			<option value="chart">{$_('indicator.view_mode.chart')}</option>
			<option value="table">{$_('indicator.view_mode.table')}</option>
		</select>

		{#if viewMode === 'chart'}
			<IndicatorChart {container} {relatedContainers} {showEffects} {showObjectives} showLegend />
		{:else if viewMode === 'table'}
			<IndicatorTable {container} {relatedContainers} {showEffects} {showObjectives} />
		{/if}

		{#if showEffects}
			<div class="measures">
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
			<div class="goals">
				<h3>{$_('goals')}</h3>
				<ul class="carousel">
					{#if overallObjective}
						<li><Card container={overallObjective} /></li>
					{/if}
					{#each relatedContainers.filter(isContainerWithObjective) as objective}
						<li>
							<Card container={objective} />
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		<div class="strategies">
			<h3>{$_('strategies')}</h3>
			<ul class="carousel">
				{#each relatedContainers.filter(isStrategyContainer) as strategy}
					<li>
						<Card container={strategy} />
					</li>
				{/each}
			</ul>
		</div>

		<EditableFormattedText
			editable={$applicationState.containerDetailView.editable}
			label={$_('description')}
			bind:value={container.payload.description}
		/>
	</svelte:fragment>
</EditableContainerDetailView>

<style>
	.view-mode {
		width: fit-content;
	}
</style>
