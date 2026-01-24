<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import MeasureMonitoring from '$lib/components/MeasureMonitoring.svelte';
	import type { PageProps } from './$types';
	import {
		audience,
		computeFacetCount,
		isContainerWithPayloadType,
		payloadTypes,
		policyFieldBNK,
		sustainableDevelopmentGoals,
		topics
	} from '$lib/models';

	let { data }: PageProps = $props();

	let container = $derived(data.container);

	let containers = $derived(data.containers);

	let measures = $derived(
		isContainerWithPayloadType(payloadTypes.enum.measure, container) ||
			isContainerWithPayloadType(payloadTypes.enum.simple_measure, container)
			? [container]
			: containers.filter(
					(c) =>
						isContainerWithPayloadType(payloadTypes.enum.measure, c) ||
						isContainerWithPayloadType(payloadTypes.enum.simple_measure, c)
				)
	);

	let facets = $derived(
		computeFacetCount(
			new Map([
				['audience', new Map(audience.options.map((v) => [v as string, 0]))],
				['sdg', new Map(sustainableDevelopmentGoals.options.map((v) => [v as string, 0]))],
				['topic', new Map(topics.options.map((v) => [v as string, 0]))],
				['policyFieldBNK', new Map(policyFieldBNK.options.map((v) => [v as string, 0]))]
			]),
			containers
		)
	);
</script>

<Layout>
	{#snippet header()}
		<Header {facets} search />
	{/snippet}

	{#snippet main()}
		<MeasureMonitoring
			measure={isContainerWithPayloadType(payloadTypes.enum.measure, container) ||
			isContainerWithPayloadType(payloadTypes.enum.simple_measure, container)
				? container
				: undefined}
			{measures}
			containers={containers.filter(
				(c) =>
					isContainerWithPayloadType(payloadTypes.enum.effect, c) ||
					isContainerWithPayloadType(payloadTypes.enum.goal, c) ||
					isContainerWithPayloadType(payloadTypes.enum.task, c)
			)}
			indicators={containers.filter((c) =>
				isContainerWithPayloadType(payloadTypes.enum.indicator, c)
			)}
			showMeasures={!isContainerWithPayloadType(payloadTypes.enum.measure, container) &&
				!isContainerWithPayloadType(payloadTypes.enum.simple_measure, container)}
		/>

		<Help slug="measures-monitoring" />
	{/snippet}
</Layout>
