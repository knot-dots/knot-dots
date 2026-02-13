<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import IOOI from '$lib/components/IOOI.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import { isGoalContainer, isMeasureContainer } from '$lib/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<Layout>
	{#snippet header()}
		<Header />
	{/snippet}

	{#snippet main()}
		{#if isGoalContainer(data.container)}
			<IOOI container={data.container} containers={data.containers} />
			<Help slug="iooi" />
		{:else if isMeasureContainer(data.container)}
			<IOOI container={data.container} containers={data.containers} />
			<Help slug="iooi" />
		{/if}
	{/snippet}
</Layout>
