<script lang="ts">
	import type { Snippet } from 'svelte';
	import { _ } from 'svelte-i18n';
	import BooleanValueToggle from '$lib/components/BooleanValueToggle.svelte';
	import Card from '$lib/components/Card.svelte';
	import NewIndicatorChart from '$lib/components/NewIndicatorChart.svelte';
	import Summary from '$lib/components/Summary.svelte';
	import {
		type ActualDataContainer,
		type BinaryIndicatorContainer,
		type IndicatorTemplateContainer,
		isActualDataContainer,
		isBinaryIndicatorContainer
	} from '$lib/models';

	interface Props {
		button?: Snippet;
		container: IndicatorTemplateContainer | BinaryIndicatorContainer;
		relatedContainers?: ActualDataContainer[];
		showRelationFilter?: boolean;
	}

	const { button, container, relatedContainers = [], showRelationFilter = false }: Props = $props();
</script>

<Card {button} {container} {relatedContainers} {showRelationFilter}>
	{#snippet body()}
		{#if isBinaryIndicatorContainer(container)}
			{@const actualDataContainer = relatedContainers.find(isActualDataContainer)}
			<Summary {container} />
			{#if actualDataContainer}
				<BooleanValueToggle
					checked={actualDataContainer.payload.booleanValue}
					disabled
					value={actualDataContainer.payload.booleanValue ? $_('yes') : $_('no')}
				/>
			{/if}
		{:else}
			<NewIndicatorChart {container} {relatedContainers} />
		{/if}
	{/snippet}

	{#snippet footer()}
		<div class="badges">
			{#each container.payload.indicatorType as indicatorType (indicatorType)}
				<span class="badge">{$_(indicatorType)}</span>
			{/each}

			{#each container.payload.indicatorCategory as indicatorCategory (indicatorCategory)}
				<span class="badge">{$_(indicatorCategory)}</span>
			{/each}
		</div>
	{/snippet}
</Card>

<style>
	.badges {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
</style>
