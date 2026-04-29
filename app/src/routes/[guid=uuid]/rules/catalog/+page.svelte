<script lang="ts">
	import Catalog from '$lib/components/Catalog.svelte';
	import Help from '$lib/components/Help.svelte';
	import RulesPage from '$lib/components/RulesPage.svelte';
	import withOptimistic from '$lib/client/withOptimistic';
	import { lastCreatedContainer, lastUpdatedContainers } from '$lib/stores';
	import type { PageProps } from './$types';
	import { payloadTypes } from '$lib/models';

	let { data }: PageProps = $props();

	let containers = $derived(
		withOptimistic(data.containers, $lastCreatedContainer, $lastUpdatedContainers)
	);
</script>

<RulesPage data={{ ...data, containers }} filterBarInitiallyOpen>
	<Catalog {containers} payloadType={[payloadTypes.enum.rule]} />
	<Help slug="rules-catalog" />
</RulesPage>
