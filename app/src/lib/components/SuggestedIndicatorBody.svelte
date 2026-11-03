<script lang="ts">
	import BooleanValueToggle from '$lib/components/BooleanValueToggle.svelte';
	import NewIndicatorChart from '$lib/components/NewIndicatorChart.svelte';
	import {
		type ActualDataPayload,
		type BinaryIndicatorPayload,
		type Container,
		type IndicatorPayload,
		isBinaryIndicatorContainer
	} from '$lib/models';

	// The actual data of a suggested indicator takes the place of its summary.
	interface Props {
		actualData: Container<ActualDataPayload>[];
		container: Container<BinaryIndicatorPayload> | Container<IndicatorPayload>;
	}

	let { actualData, container }: Props = $props();
</script>

{#if isBinaryIndicatorContainer(container)}
	{#if actualData[0]}
		<BooleanValueToggle checked={actualData[0].payload.booleanValue} disabled />
	{/if}
{:else if actualData.length > 0}
	<NewIndicatorChart {container} relatedContainers={actualData} />
{/if}
