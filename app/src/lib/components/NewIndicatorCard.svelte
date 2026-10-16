<script lang="ts">
	import type { Snippet } from 'svelte';
	import { _ } from 'svelte-i18n';
	import BooleanValueToggle from '$lib/components/BooleanValueToggle.svelte';
	import type { SvelteMap } from 'svelte/reactivity';
	import Card from '$lib/components/Card.svelte';
	import ImpactMonitoringChart from '$lib/components/ImpactMonitoringChart.svelte';
	import NewIndicatorChart from '$lib/components/NewIndicatorChart.svelte';
	import Summary from '$lib/components/Summary.svelte';
	import TargetCheck from '$lib/components/TargetCheck.svelte';
	import { getReviewContext } from '$lib/contexts/review.svelte';
	import { indicatorActualData } from '$lib/indicatorActualData';
	import {
		type ActualDataPayload,
		type BinaryIndicatorPayload,
		type Container,
		type IndicatorPayload,
		isActualDataContainer,
		isBinaryIndicatorContainer,
		isEffectContainer,
		isObjectiveContainer
	} from '$lib/models';
	import { reviewStatusFor } from '$lib/reviewStatus';
	import { reviewStatusAuraColor } from '$lib/theme/models';

	interface Props {
		button?: Snippet;
		compare?: boolean;
		container: Container<BinaryIndicatorPayload> | Container<IndicatorPayload>;
		ignoreBulkActionContext?: boolean;
		relatedContainers?: Container[];
		showRelationFilter?: boolean;
		comparisonDataMap?: SvelteMap<string, Container<ActualDataPayload>[]>;
	}

	const {
		button,
		compare = false,
		container,
		ignoreBulkActionContext = false,
		relatedContainers = [],
		showRelationFilter = false,
		comparisonDataMap
	}: Props = $props();

	// Extract comparison containers for this specific indicator
	let comparisonContainers = $derived(comparisonDataMap?.get(container.guid));

	let hasComparisonData = $derived(
		comparisonContainers?.some(({ payload }) => payload.values.length > 0) ?? false
	);

	// Objectives and effects of the current organization for this indicator
	let hasOwnTargets = $derived(
		relatedContainers.some((c) => isEffectContainer(c) || isObjectiveContainer(c))
	);

	const review = getReviewContext();

	// The review compares the indicator with programs of others, so it is left
	// out when the organization has set its own targets for the indicator.
	const reviewStatus = $derived(
		hasOwnTargets
			? undefined
			: reviewStatusFor(
					indicatorActualData(container.guid, relatedContainers),
					(review.objectivesByIndicator.get(container.guid) ?? []).map(
						({ objective }) => objective.payload
					)
				)
	);

	const auraColor = $derived(reviewStatus && reviewStatusAuraColor(reviewStatus));
</script>

<Card
	{auraColor}
	{button}
	{container}
	{ignoreBulkActionContext}
	{relatedContainers}
	{showRelationFilter}
>
	{#snippet titleAside()}
		{#if reviewStatus}
			<TargetCheck status={reviewStatus} />
		{/if}
	{/snippet}

	{#snippet body()}
		{#if isBinaryIndicatorContainer(container)}
			{@const actualDataContainer = relatedContainers.find(isActualDataContainer)}
			<Summary {container} />
			{#if actualDataContainer}
				<BooleanValueToggle checked={actualDataContainer.payload.booleanValue} disabled />
			{/if}
		{:else if hasOwnTargets && !(compare && hasComparisonData)}
			<ImpactMonitoringChart {container} {relatedContainers} />
		{:else}
			<NewIndicatorChart {container} {relatedContainers} {comparisonContainers} />
		{/if}
	{/snippet}

	{#snippet footer()}
		<div class="badges">
			{#each container.payload.indicatorType as indicatorType (indicatorType)}
				<span class="badge badge--indigo">{$_(indicatorType)}</span>
			{/each}

			{#each container.payload.indicatorCategory as indicatorCategory (indicatorCategory)}
				<span class="badge badge--indigo">{$_(indicatorCategory)}</span>
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
