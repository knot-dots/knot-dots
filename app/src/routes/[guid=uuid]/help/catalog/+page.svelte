<script lang="ts">
	import Catalog from '$lib/components/Catalog.svelte';
	import Help from '$lib/components/Help.svelte';
	import HelpPage from '$lib/components/HelpPage.svelte';
	import { payloadTypes } from '$lib/models';
	import withOptimistic from '$lib/client/withOptimistic';
	import { lastCreatedContainer, lastUpdatedContainers } from '$lib/stores';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let containers = $derived(
		withOptimistic(data.containers, $lastCreatedContainer, $lastUpdatedContainers)
	);
</script>

<HelpPage>
	<Catalog {containers} payloadType={[payloadTypes.enum.help]} />
	<Help slug="help-catalog" />
</HelpPage>
