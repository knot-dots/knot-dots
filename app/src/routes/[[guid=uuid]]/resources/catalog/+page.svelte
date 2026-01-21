<script lang="ts">
	import Catalog from '$lib/components/Catalog.svelte';
	import Help from '$lib/components/Help.svelte';
	import ResourcesPage from '$lib/components/ResourcesPage.svelte';
	import type { PageProps } from './$types';
	import { payloadTypes } from '$lib/models';

	let { data }: PageProps = $props();
</script>

<ResourcesPage {data}>
	<Catalog containers={data.containers} payloadType={[payloadTypes.enum.resource_v2]} />
	<Help slug="resources-catalog" />
</ResourcesPage>
