<script lang="ts">
	import { ChevronLeft, Icon, Pencil } from 'svelte-hero-icons';
	import ContainerDetailView from '$lib/components/ContainerDetailView.svelte';
	import InternalObjectiveDetailView from '$lib/components/InternalObjectiveDetailView.svelte';
	import InternalObjectiveTaskDetailView from '$lib/components/InternalObjectiveTaskDetailView.svelte';
	import MeasureDetailView from '$lib/components/MeasureDetailView.svelte';
	import StrategyDetailView from '$lib/components/StrategyDetailView.svelte';
	import StrategyOverlay from '$lib/components/StrategyOverlay.svelte';
	import {
		isContainer,
		isEmptyOrganizationalUnitContainer,
		isInternalObjectiveContainer,
		isMeasureContainer,
		isStrategyContainer,
		isTaskContainer
	} from '$lib/models';
	import { ability } from '$lib/stores';
	import type { PageData } from './$types';

	export let data: PageData;

	$: container = data.container;
	$: relatedContainers = data.relatedContainers;
	$: revisions = data.revisions;
</script>

{#if isStrategyContainer(container)}
	<div class="strategy">
		<div class="detail-page-content strategy-inner">
			<StrategyDetailView {container} {relatedContainers} {revisions} />
		</div>
	</div>
	{#if data.strategyOverlayData}
		<StrategyOverlay {...data.strategyOverlayData} />
	{/if}
{:else}
	<div class="detail-page-content">
		{#if isMeasureContainer(container)}
			<MeasureDetailView {container} {relatedContainers} {revisions} />
		{:else if isTaskContainer(container)}
			<InternalObjectiveTaskDetailView {container} {relatedContainers} {revisions} />
		{:else if isInternalObjectiveContainer(container)}
			<InternalObjectiveDetailView {container} {relatedContainers} {revisions} />
		{:else if isEmptyOrganizationalUnitContainer(container)}
			<ContainerDetailView {container} {relatedContainers} {revisions} />
		{:else if isContainer(container)}
			<ContainerDetailView {container} {relatedContainers} {revisions} />
		{/if}
	</div>
{/if}

<style>
	.strategy {
		flex: 1 1;
		overflow-x: auto;
	}

	.strategy-inner {
		min-width: calc(100vw - 20rem);
		overflow-y: auto;
	}
</style>
