<script lang="ts">
	import Catalog from '$lib/components/Catalog.svelte';
	import ContextTabs from '$lib/components/ContextTabs.svelte';
	import ProgramsPage from '$lib/components/ProgramsPage.svelte';
	import type { PageProps } from './$types';
	import { payloadTypes } from '$lib/models';

	let { data }: PageProps = $props();
</script>

<ProgramsPage facets={data.facets} filterBarInitiallyOpen>
	<Catalog containers={data.containers} payloadType={[payloadTypes.enum.program]} />
	<ContextTabs slug="guides-catalog" />
</ProgramsPage>
