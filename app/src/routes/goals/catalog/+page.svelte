<script lang="ts">
	import Catalog from '$lib/components/Catalog.svelte';
	import Help from '$lib/components/Help.svelte';
	import GoalsPage from '$lib/components/GoalsPage.svelte';
	import { payloadTypes } from '$lib/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<GoalsPage {data}>
	<Catalog containers={data.containers} payloadType={[payloadTypes.enum.goal]} />
	<Help slug="goals-catalog" />
</GoalsPage>
