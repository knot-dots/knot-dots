<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import Measures from '$lib/components/Measures.svelte';
	import type { CategoryOptions } from '$lib/categoryOptions';
	import type { PageProps } from './$types';

	type PagePropsWithCategories = Omit<PageProps, 'data'> & {
		data: PageProps['data'] & {
			facetLabels?: Map<string, string>;
			categoryOptions?: CategoryOptions | null;
		};
	};

	let { data }: PagePropsWithCategories = $props();

	const workspaceOptions = [
		{ label: $_('workspace.profile'), value: '/me' },
		{ label: $_('workspace.profile.tasks'), value: '/me/tasks' },
		{ label: $_('workspace.profile.measures'), value: '/me/measures' }
	];
</script>

<Layout>
	{#snippet header()}
		<Header
			facets={data.facets}
			facetLabels={data.facetLabels}
			categoryOptions={data.categoryOptions}
			search
			{workspaceOptions}
		/>
	{/snippet}

	{#snippet main()}
		<Measures containers={data.containers} />
		<Help slug="measures-status" />
	{/snippet}
</Layout>
