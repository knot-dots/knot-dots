<script lang="ts">
	import { setContext } from 'svelte';
	import withOptimistic from '$lib/client/withOptimistic';
	import ContextTabs from '$lib/components/ContextTabs.svelte';
	import FullscreenLayout from '$lib/components/FullscreenLayout.svelte';
	import Header from '$lib/components/Header.svelte';
	import IOOI from '$lib/components/IOOI.svelte';
	import PageLayout from '$lib/components/PageLayout.svelte';
	import { isGoalContainer, isMeasureContainer, predicates } from '$lib/models';
	import { lastCreatedContainers, lastDeletedContainers, lastUpdatedContainers } from '$lib/stores';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let containers = $derived(
		withOptimistic(
			data.containers,
			$lastCreatedContainers,
			$lastDeletedContainers,
			$lastUpdatedContainers
		)
	);

	setContext('relationOverlay', {
		enabled: true,
		predicates: [predicates.enum['contributes-to']]
	});
</script>

<PageLayout>
	<FullscreenLayout>
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
	</FullscreenLayout>
</PageLayout>
