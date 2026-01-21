<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Card from '$lib/components/Card.svelte';
	import type { ActualDataContainer, IndicatorTemplateContainer } from '$lib/models.js';
	import NewIndicatorChart from '$lib/components/NewIndicatorChart.svelte';

	interface Props {
		container: IndicatorTemplateContainer;
		relatedContainers?: ActualDataContainer[];
		showRelationFilter?: boolean;
	}

	const { container, relatedContainers = [], showRelationFilter = false }: Props = $props();
</script>

<Card {container} {relatedContainers} {showRelationFilter}>
	{#snippet body()}
		<NewIndicatorChart {container} {relatedContainers} />
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
