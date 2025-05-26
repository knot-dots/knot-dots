<script lang="ts">
	import Catalog from '$lib/components/Catalog.svelte';
	import Help from '$lib/components/Help.svelte';
	import GoalsPage from '$lib/components/GoalsPage.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<GoalsPage {data}>
	<Catalog containers={data.containers} />
	<Help slug="goals-catalog" />
</GoalsPage>
