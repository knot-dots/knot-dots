<script lang="ts">
	import { browser } from '$app/environment';
	import AllPage from '$lib/components/AllPage.svelte';
	import Catalog from '$lib/components/Catalog.svelte';
	import { payloadTypes } from '$lib/models';
	import withOptimistic from '$lib/client/withOptimistic';
	import { lastCreatedContainer, lastUpdatedContainers } from '$lib/stores';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let containers = $derived(
		withOptimistic(data.containers, $lastCreatedContainer, $lastUpdatedContainers)
	);
</script>

<AllPage data={{ ...data, containers }} filterBarInitiallyOpen>
	<Catalog
		containers={containers.slice(0, browser ? undefined : 20)}
		payloadType={[payloadTypes.enum.report]}
	/>
</AllPage>
