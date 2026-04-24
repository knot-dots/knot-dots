<script lang="ts">
	import Catalog from '$lib/components/Catalog.svelte';
	import Help from '$lib/components/Help.svelte';
	import GoalsPage from '$lib/components/GoalsPage.svelte';
	import withOptimistic from '$lib/client/withOptimistic';
	import { lastCreatedContainer, lastUpdatedContainers } from '$lib/stores';
	import { payloadTypes } from '$lib/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let containers = $derived(
		withOptimistic(data.containers, $lastCreatedContainer, $lastUpdatedContainers)
	);
</script>

<GoalsPage data={{ ...data, containers }} filterBarInitiallyOpen>
	<Catalog {containers} payloadType={[payloadTypes.enum.goal]} />
	<Help slug="goals-catalog" />
</GoalsPage>
