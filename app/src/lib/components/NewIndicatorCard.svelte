<script lang="ts">
	import type { Snippet } from 'svelte';
	import { _ } from 'svelte-i18n';
	import BooleanValueToggle from '$lib/components/BooleanValueToggle.svelte';
	import type { SvelteMap } from 'svelte/reactivity';
	import Card from '$lib/components/Card.svelte';
	import NewIndicatorChart from '$lib/components/NewIndicatorChart.svelte';
	import Summary from '$lib/components/Summary.svelte';
	import {
		type ActualDataPayload,
		type BinaryIndicatorPayload,
		type Container,
		type IndicatorTemplatePayload,
		isContainerWithPayloadType,
		payloadTypes
	} from '$lib/models';

	interface Props {
		button?: Snippet;
		container: Container<BinaryIndicatorPayload> | Container<IndicatorTemplatePayload>;
		relatedContainers?: Container<ActualDataPayload>[];
		showRelationFilter?: boolean;
		comparisonDataMap?: SvelteMap<string, Container<ActualDataPayload>[]>;
	}

	const {
		button,
		container,
		relatedContainers = [],
		showRelationFilter = false,
		comparisonDataMap
	}: Props = $props();

	// Extract comparison containers for this specific indicator
	let comparisonContainers = $derived(comparisonDataMap?.get(container.guid));
</script>

<Card {button} {container} {relatedContainers} {showRelationFilter}>
	{#snippet body()}
		{#if isContainerWithPayloadType(payloadTypes.enum.binary_indicator, container)}
			{@const actualDataContainer = relatedContainers.find((c) =>
				isContainerWithPayloadType(payloadTypes.enum.actual_data, c)
			)}
			<Summary {container} />
			{#if actualDataContainer}
				<BooleanValueToggle checked={actualDataContainer.payload.booleanValue} disabled />
			{/if}
		{:else}
			<NewIndicatorChart {container} {relatedContainers} {comparisonContainers} />
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
