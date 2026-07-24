<script lang="ts">
	import Catalog from '$lib/components/Catalog.svelte';
	import ContextTabs from '$lib/components/ContextTabs.svelte';
	import ResourcesPage from '$lib/components/ResourcesPage.svelte';
	import withOptimistic from '$lib/client/withOptimistic';
	import { lastCreatedContainers, lastDeletedContainers, lastUpdatedContainers } from '$lib/stores';
	import type { PageProps } from './$types';
	import { payloadTypes } from '$lib/models';

	let { data }: PageProps = $props();

	let containers = $derived(
		withOptimistic(
			data.containers,
			$lastCreatedContainers,
			$lastDeletedContainers,
			$lastUpdatedContainers
		)
	);
</script>

<ResourcesPage data={{ ...data, containers }}>
	<Catalog {containers} payloadType={[payloadTypes.enum.resource_v2]} />
	<ContextTabs slug="resources-catalog" />
</ResourcesPage>
