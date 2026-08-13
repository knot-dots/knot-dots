<script lang="ts">
	import { browser } from '$app/environment';
	import withOptimistic from '$lib/client/withOptimistic';
	import AdministrativeAreaCard from '$lib/components/AdministrativeAreaCard.svelte';
	import Catalog from '$lib/components/Catalog.svelte';
	import FullscreenLayout from '$lib/components/FullscreenLayout.svelte';
	import Header from '$lib/components/Header.svelte';
	import PageLayout from '$lib/components/PageLayout.svelte';
	import { lastCreatedContainers, lastDeletedContainers, lastUpdatedContainers } from '$lib/stores';
	import type { PageProps } from './$types';

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

<PageLayout>
	<FullscreenLayout>
		{#snippet header()}
			<Header workspaceOptions={[]} facets={data.facets} filterBarInitiallyOpen search />
		{/snippet}

		{#snippet main()}
			<Catalog containers={containers.slice(0, browser ? undefined : 20)} payloadType={[]}>
				{#snippet item(container)}
					<AdministrativeAreaCard {container} />
				{/snippet}
			</Catalog>
		{/snippet}
	</FullscreenLayout>
</PageLayout>
