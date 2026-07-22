<script lang="ts">
	import { setContext } from 'svelte';
	import ContextTabs from '$lib/components/ContextTabs.svelte';
	import Header from '$lib/components/Header.svelte';
	import IOOI from '$lib/components/IOOI.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import { isGoalContainer, isMeasureContainer, predicates } from '$lib/models';
	import withOptimistic from '$lib/client/withOptimistic';
	import { lastCreatedContainer, lastDeletedContainers, lastUpdatedContainers } from '$lib/stores';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let containers = $derived(
		withOptimistic(
			data.containers,
			$lastCreatedContainer,
			$lastDeletedContainers,
			$lastUpdatedContainers
		)
	);

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
		{#if isGoalContainer(data.container)}
			<IOOI container={data.container} {containers} />
			<ContextTabs slug="iooi" />
		{:else if isMeasureContainer(data.container)}
			<IOOI container={data.container} {containers} />
			<ContextTabs slug="iooi" />
		{/if}
	{/snippet}
</Layout>
