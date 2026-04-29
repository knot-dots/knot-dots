<script lang="ts">
	import { browser } from '$app/environment';
	import AllPage from '$lib/components/AllPage.svelte';
	import Catalog from '$lib/components/Catalog.svelte';
	import Help from '$lib/components/Help.svelte';
	import { payloadTypes } from '$lib/models';
	import withOptimistic from '$lib/client/withOptimistic';
	import { lastCreatedContainer, lastUpdatedContainers } from '$lib/stores';
	import type { PageProps } from './$types';
	import { createFeatureDecisions } from '$lib/features';

	let { data }: PageProps = $props();

	let containers = $derived(
		withOptimistic(data.containers, $lastCreatedContainer, $lastUpdatedContainers)
	);

	let featureDecisions = $derived(createFeatureDecisions(data.features));
</script>

<AllPage data={{ ...data, containers }} filterBarInitiallyOpen>
	<Catalog
		containers={containers.slice(0, browser ? undefined : 20)}
		payloadType={[
			payloadTypes.enum.goal,
			payloadTypes.enum.measure,
			...(featureDecisions.usePage() ? [payloadTypes.enum.page] : []),
			payloadTypes.enum.program,
			...(featureDecisions.useReport() ? [payloadTypes.enum.report] : []),
			payloadTypes.enum.rule,
			payloadTypes.enum.simple_measure
		]}
	/>
	<Help slug="all-catalog" />
</AllPage>
