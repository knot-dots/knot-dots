<script lang="ts">
	import Catalog from '$lib/components/Catalog.svelte';
	import Help from '$lib/components/Help.svelte';
	import ProgramsPage from '$lib/components/ProgramsPage.svelte';
	import type { PageProps } from './$types';
	import { payloadTypes } from '$lib/models';

	let { data }: PageProps = $props();
</script>

<ProgramsPage
	{data}
	filterBarInitiallyOpen
	showSaveWorkspace
	savePayloadType={[payloadTypes.enum.program]}
>
	<Catalog containers={data.containers} payloadType={[payloadTypes.enum.program]} />
	<Help slug="programs-catalog" />
</ProgramsPage>
