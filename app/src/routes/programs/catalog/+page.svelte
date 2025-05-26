<script lang="ts">
	import Catalog from '$lib/components/Catalog.svelte';
	import Help from '$lib/components/Help.svelte';
	import ProgramsPage from '$lib/components/ProgramsPage.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<ProgramsPage {data}>
	<Catalog containers={data.containers} />
	<Help slug="programs-catalog" />
</ProgramsPage>
