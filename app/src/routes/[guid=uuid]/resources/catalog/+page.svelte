<script lang="ts">
	import Catalog from '$lib/components/Catalog.svelte';
	import Help from '$lib/components/Help.svelte';
	import ResourcesPage from '$lib/components/ResourcesPage.svelte';
	import withOptimistic from '$lib/client/withOptimistic';
	import { lastCreatedContainer, lastUpdatedContainers } from '$lib/stores';
	import type { PageProps } from './$types';
	import { payloadTypes } from '$lib/models';

	let { data }: PageProps = $props();

	let containers = $derived(
		withOptimistic(data.containers, $lastCreatedContainer, $lastUpdatedContainers)
	);
</script>

<ResourcesPage data={{ ...data, containers }}>
	<Catalog {containers} payloadType={[payloadTypes.enum.resource_v2]} />
	<Help slug="resources-catalog" />
</ResourcesPage>
