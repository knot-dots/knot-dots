<script lang="ts">
	import Catalog from '$lib/components/Catalog.svelte';
	import Help from '$lib/components/Help.svelte';
	import MeasuresPage from '$lib/components/MeasuresPage.svelte';
	import withOptimistic from '$lib/client/withOptimistic';
	import { lastCreatedContainer, lastUpdatedContainers } from '$lib/stores';
	import type { PageProps } from './$types';
	import { payloadTypes } from '$lib/models';

	let { data }: PageProps = $props();

	let containers = $derived(
		withOptimistic(data.containers, $lastCreatedContainer, $lastUpdatedContainers)
	);
</script>

<MeasuresPage data={{ ...data, containers }} filterBarInitiallyOpen>
	<Catalog
		{containers}
		payloadType={[payloadTypes.enum.measure, payloadTypes.enum.simple_measure]}
	/>
	<Help slug="measures-catalog" />
</MeasuresPage>
