<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import IOOI from '$lib/components/IOOI.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<Layout>
	{#snippet header()}
		<Header />
	{/snippet}

	{#snippet main()}
		<IOOI container={data.container} containers={data.containers} />

		<Help slug="goals-iooi" />
	{/snippet}
</Layout>
