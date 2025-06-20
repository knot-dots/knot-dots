<script lang="ts">
	import Catalog from '$lib/components/Catalog.svelte';
	import Help from '$lib/components/Help.svelte';
	import ResolutionsPage from '$lib/components/ProgramsPage.svelte';
	import type { PageProps } from './$types';
	import { payloadTypes } from '$lib/models';

	let { data }: PageProps = $props();
</script>

<ResolutionsPage {data}>
	<Catalog containers={data.containers} payloadType={[payloadTypes.enum.resolution]} />
	<Help slug="resolutions-catalog" />
</ResolutionsPage>
