<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Header from '$lib/components/Header.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import Tasks from '$lib/components/Tasks.svelte';
	import { computeFacetCount, taskCategories } from '$lib/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const workspaceOptions = [
		{ label: $_('workspace.profile'), value: '/me' },
		{ label: $_('workspace.profile.tasks'), value: '/me/tasks' },
		{ label: $_('workspace.profile.measures'), value: '/me/measures' }
	];

	let facets = $derived.by(() => {
		const facets = new Map([
			['taskCategory', new Map(taskCategories.options.map((v) => [v as string, 0]))]
		]);

		return computeFacetCount(facets, data.containers);
	});
</script>

<Layout>
	<Header {facets} search sortOptions={[]} {workspaceOptions} slot="header" />
	<Tasks containers={data.containers} slot="main" />
</Layout>
