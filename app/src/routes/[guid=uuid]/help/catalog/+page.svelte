<script lang="ts">
	import Catalog from '$lib/components/Catalog.svelte';
	import Help from '$lib/components/Help.svelte';
	import HelpPage from '$lib/components/HelpPage.svelte';
	import { payloadTypes } from '$lib/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<HelpPage>
	<Catalog containers={data.containers} payloadType={[payloadTypes.enum.help]} />
	<Help slug="help-catalog" />
</HelpPage>
