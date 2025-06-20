<script lang="ts">
	import Catalog from '$lib/components/Catalog.svelte';
	import Help from '$lib/components/Help.svelte';
	import ProgramsPage from '$lib/components/ProgramsPage.svelte';
	import type { PageProps } from './$types';
	import { payloadTypes } from '$lib/models';

	let { data }: PageProps = $props();
</script>

<ProgramsPage {data}>
	<Catalog containers={data.containers} payloadType={[payloadTypes.enum.strategy]} />
	<Help slug="programs-catalog" />
</ProgramsPage>
