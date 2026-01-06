<script lang="ts">
	import Catalog from '$lib/components/Catalog.svelte';
	import Help from '$lib/components/Help.svelte';
	import RulesPage from '$lib/components/RulesPage.svelte';
	import type { PageProps } from './$types';
	import { payloadTypes } from '$lib/models';

	let { data }: PageProps = $props();
</script>

<RulesPage {data} filtersInitiallyOpened>
	<Catalog containers={data.containers} payloadType={[payloadTypes.enum.rule]} />
	<Help slug="rules-catalog" />
</RulesPage>
