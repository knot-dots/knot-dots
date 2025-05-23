<script lang="ts">
	import { getContext } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import MeasureMonitoring from '$lib/components/MeasureMonitoring.svelte';
	import {
		type AnyContainer,
		audience,
		type Container,
		isIndicatorContainer,
		isMeasureContainer,
		isMeasureMonitoringContainer,
		isSimpleMeasureContainer,
		measureTypes,
		policyFieldBNK,
		sustainableDevelopmentGoals,
		topics
	} from '$lib/models';

	interface Props {
		container: AnyContainer;
		containers: Container[];
	}

	let { container, containers }: Props = $props();

	let measures = $derived(
		isMeasureContainer(container) || isSimpleMeasureContainer(container)
			? [container]
			: containers.filter((c) => isMeasureContainer(c) || isSimpleMeasureContainer(c))
	);

	const facets = new Map([
		['audience', new Map(audience.options.map((v) => [v as string, 0]))],
		['category', new Map(sustainableDevelopmentGoals.options.map((v) => [v as string, 0]))],
		['topic', new Map(topics.options.map((v) => [v as string, 0]))],
		['policyFieldBNK', new Map(policyFieldBNK.options.map((v) => [v as string, 0]))],
		['measureType', new Map(measureTypes.options.map((v) => [v as string, 0]))]
	]);

	let workspaceOptions = getContext<Array<{ label: string; value: string }>>('workspaceOptions');
</script>

<Header {facets} search {workspaceOptions} />

<MeasureMonitoring
	measure={isMeasureContainer(container) || isSimpleMeasureContainer(container)
		? container
		: undefined}
	{measures}
	containers={containers.filter(isMeasureMonitoringContainer)}
	indicators={containers.filter(isIndicatorContainer)}
	showMeasures={!isMeasureContainer(container) && !isSimpleMeasureContainer(container)}
/>
