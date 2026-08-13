<script lang="ts">
	import Catalog from '$lib/components/Catalog.svelte';
	import ContextTabs from '$lib/components/ContextTabs.svelte';
	import PageLayout from '$lib/components/PageLayout.svelte';
	import ProgramsPage from '$lib/components/ProgramsPage.svelte';
	import { payloadTypes } from '$lib/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<PageLayout>
	<ProgramsPage facets={data.facets} filterBarInitiallyOpen>
		<Catalog containers={data.containers} payloadType={[payloadTypes.enum.program]} />
		<ContextTabs slug="set-of-rules-catalog" />
	</ProgramsPage>
</PageLayout>
