<script lang="ts">
	import { setContext } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import IOOI from '$lib/components/IOOI.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import { isContainerWithPayloadType, payloadTypes, predicates } from '$lib/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	setContext('relationOverlay', {
		enabled: true,
		predicates: [predicates.enum['contributes-to']]
	});
</script>

<Layout>
	{#snippet header()}
		<Header />
	{/snippet}

	{#snippet main()}
		{#if isContainerWithPayloadType(payloadTypes.enum.goal, data.container)}
			<IOOI container={data.container} containers={data.containers} />
			<Help slug="iooi" />
		{:else if isContainerWithPayloadType(payloadTypes.enum.measure, data.container)}
			<IOOI container={data.container} containers={data.containers} />
			<Help slug="iooi" />
		{/if}
	{/snippet}
</Layout>
