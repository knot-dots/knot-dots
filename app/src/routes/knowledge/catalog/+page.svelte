<script lang="ts">
	import Catalog from '$lib/components/Catalog.svelte';
	import Help from '$lib/components/Help.svelte';
	import KnowledgePage from '$lib/components/KnowledgePage.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<KnowledgePage {data}>
	<Catalog containers={data.containers} />
	<Help slug="knowledge-catalog" />
</KnowledgePage>
