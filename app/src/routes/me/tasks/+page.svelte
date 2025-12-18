<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import Tasks from '$lib/components/Tasks.svelte';
	import { computeFacetCount, fromCounts, taskCategories } from '$lib/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const workspaceOptions = [
		{ label: $_('workspace.profile'), value: '/me' },
		{ label: $_('workspace.profile.tasks'), value: '/me/tasks' },
		{ label: $_('workspace.profile.measures'), value: '/me/measures' }
	];

	let facets = $derived.by(() => {
		const facets = new Map([
			['taskCategory', fromCounts(taskCategories.options, data.facets.taskCategory)]
		]);

		if (Object.keys(data.facets).length === 0) {
			return computeFacetCount(facets, data.containers);
		}

		return facets;
	});
</script>

<Layout>
	{#snippet header()}
		<Header {facets} search sortOptions={[]} {workspaceOptions} />
	{/snippet}

	{#snippet main()}
		<Tasks containers={data.containers} />
		<Help slug="tasks-status" />
	{/snippet}
</Layout>
