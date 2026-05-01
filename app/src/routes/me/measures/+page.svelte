<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import Measures from '$lib/components/Measures.svelte';
	import withOptimistic from '$lib/client/withOptimistic';
	import { lastCreatedContainer, lastUpdatedContainers } from '$lib/stores';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const workspaceOptions = [
		{ label: $_('workspace.profile'), value: '/me' },
		{ label: $_('workspace.profile.tasks'), value: '/me/tasks' },
		{ label: $_('workspace.profile.measures'), value: '/me/measures' }
	];

	let containers = $derived(
		withOptimistic(data.containers, $lastCreatedContainer, $lastUpdatedContainers)
	);

	let facets = $derived(data.facets);
</script>

<Layout>
	{#snippet header()}
		<Header {facets} search {workspaceOptions} />
	{/snippet}

	{#snippet main()}
		<Measures {containers} />
		<Help slug="measures-status" />
	{/snippet}
</Layout>
