<script lang="ts">
	import Catalog from '$lib/components/Catalog.svelte';
	import Help from '$lib/components/Help.svelte';
	import KnowledgePage from '$lib/components/KnowledgePage.svelte';
	import { payloadTypes } from '$lib/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<KnowledgePage {data} filtersInitiallyOpened>
	<Catalog containers={data.containers} payloadType={[payloadTypes.enum.knowledge]} />
	<Help slug="knowledge-catalog" />
</KnowledgePage>
