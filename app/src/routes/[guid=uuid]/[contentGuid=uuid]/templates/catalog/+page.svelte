<script lang="ts">
	import { setContext } from 'svelte';
	import BulkActionContextProvider from '$lib/components/BulkActionContextProvider.svelte';
	import Catalog from '$lib/components/Catalog.svelte';
	import ContextTabs from '$lib/components/ContextTabs.svelte';
	import FullscreenLayout from '$lib/components/FullscreenLayout.svelte';
	import Header from '$lib/components/Header.svelte';
	import PageLayout from '$lib/components/PageLayout.svelte';
	import { predicates, templatablePayloadTypes } from '$lib/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

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
					containers={data.containers}
					payloadType={[...templatablePayloadTypes]}
					createAsTemplate={true}
				/>

				<ContextTabs slug="templates-catalog" />
			{/snippet}
		</FullscreenLayout>
	</BulkActionContextProvider>
</PageLayout>
