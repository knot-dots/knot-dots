<script lang="ts">
	import Catalog from '$lib/components/Catalog.svelte';
	import Help from '$lib/components/Help.svelte';
	import MeasuresPage from '$lib/components/MeasuresPage.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<MeasuresPage {data}>
	<Catalog containers={data.containers} />
	<Help slug="measures-catalog" />
</MeasuresPage>
