<script lang="ts">
	import { setContext } from 'svelte';
	import withOptimistic from '$lib/client/withOptimistic';
	import BulkActionContextProvider from '$lib/components/BulkActionContextProvider.svelte';
	import Catalog from '$lib/components/Catalog.svelte';
	import ContextTabs from '$lib/components/ContextTabs.svelte';
	import FullscreenLayout from '$lib/components/FullscreenLayout.svelte';
	import Header from '$lib/components/Header.svelte';
	import PageLayout from '$lib/components/PageLayout.svelte';
	import {
		getAvailableInScopeGuids,
		isTemplateRoot,
		predicates,
		templatablePayloadTypes
	} from '$lib/models';
	import { lastCreatedContainers, lastDeletedContainers, lastUpdatedContainers } from '$lib/stores';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let containers = $derived(
		withOptimistic(
			data.containers,
			$lastCreatedContainers,
			$lastDeletedContainers,
			$lastUpdatedContainers,
			(container) =>
				isTemplateRoot(container) &&
				getAvailableInScopeGuids(container).includes(data.container.guid)
		)
	);

	setContext('relationOverlay', {
		enabled: true,
		predicates: [
			predicates.enum['is-consistent-with'],
			predicates.enum['is-equivalent-to'],
			predicates.enum['is-inconsistent-with'],
			predicates.enum['is-prerequisite-for']
		]
	});
</script>

<PageLayout>
	<BulkActionContextProvider actions={['visibility', 'delete']}>
		<FullscreenLayout>
			{#snippet header()}
				<Header facets={data.facets} search />
			{/snippet}

			{#snippet main()}
				<Catalog
					availableIn={data.container.guid}
					{containers}
					payloadType={[...templatablePayloadTypes]}
					createAsTemplate={true}
				/>

				<ContextTabs slug="templates-catalog" />
			{/snippet}
		</FullscreenLayout>
	</BulkActionContextProvider>
</PageLayout>
