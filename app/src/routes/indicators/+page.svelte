<script lang="ts">
	import { setContext } from 'svelte';
	import Indicators from '$lib/components/Indicators.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import { predicates } from '$lib/models';
	import type { PageData } from './$types';

	export let data: PageData;

	setContext('relationOverlay', {
		enabled: true,
		predicates: [predicates.enum['is-affected-by']]
	});
</script>

<Layout>
	<svelte:fragment slot="main">
		<Indicators containers={data.containers} />
	</svelte:fragment>
</Layout>
