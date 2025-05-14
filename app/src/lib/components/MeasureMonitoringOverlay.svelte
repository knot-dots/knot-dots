<script lang="ts">
	import MeasureMonitoring from '$lib/components/MeasureMonitoring.svelte';
	import Search from '$lib/components/Search.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Sort from '$lib/components/Sort.svelte';
	import {
		type AnyContainer,
		type Container,
		isIndicatorContainer,
		isMeasureContainer,
		isMeasureMonitoringContainer,
		isSimpleMeasureContainer
	} from '$lib/models';

	export let container: AnyContainer;
	export let containers: Container[];

	$: measures =
		isMeasureContainer(container) || isSimpleMeasureContainer(container)
			? [container]
			: containers.filter((c) => isMeasureContainer(c) || isSimpleMeasureContainer(c));
</script>

<aside>
	<Sidebar helpSlug="internal-objectives">
		<Search slot="search" />
		<Sort slot="sort" />
		<slot slot="extra" />
	</Sidebar>
</aside>

<MeasureMonitoring
	measure={isMeasureContainer(container) || isSimpleMeasureContainer(container)
		? container
		: undefined}
	{measures}
	containers={containers.filter(isMeasureMonitoringContainer)}
	indicators={containers.filter(isIndicatorContainer)}
	showMeasures={!isMeasureContainer(container) && !isSimpleMeasureContainer(container)}
/>
