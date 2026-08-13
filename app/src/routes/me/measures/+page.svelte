<script lang="ts">
	import { _ } from 'svelte-i18n';
	import withOptimistic from '$lib/client/withOptimistic';
	import ContextTabs from '$lib/components/ContextTabs.svelte';
	import FullscreenLayout from '$lib/components/FullscreenLayout.svelte';
	import Header from '$lib/components/Header.svelte';
	import Measures from '$lib/components/Measures.svelte';
	import PageLayout from '$lib/components/PageLayout.svelte';
	import { lastCreatedContainers, lastDeletedContainers, lastUpdatedContainers } from '$lib/stores';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const workspaceOptions = [
		{ label: $_('workspace.profile'), value: '/me' },
		{ label: $_('workspace.profile.tasks'), value: '/me/tasks' },
		{ label: $_('workspace.profile.measures'), value: '/me/measures' }
	];

	let containers = $derived(
		withOptimistic(
			data.containers,
			$lastCreatedContainers,
			$lastDeletedContainers,
			$lastUpdatedContainers
		)
	);

	let facets = $derived(data.facets);
</script>

<PageLayout>
	<FullscreenLayout>
		{#snippet header()}
			<Header {facets} search {workspaceOptions} />
		{/snippet}

		{#snippet main()}
			<Measures {containers} />
			<ContextTabs slug="measures-status" />
		{/snippet}
	</FullscreenLayout>
</PageLayout>
