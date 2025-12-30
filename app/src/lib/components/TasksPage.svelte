<script lang="ts">
	import { setContext, type Snippet } from 'svelte';
	import { page } from '$app/state';
	import Header from '$lib/components/Header.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import {
		computeFacetCount,
		type Container,
		fromCounts,
		predicates,
		taskCategories
	} from '$lib/models';

	interface Props {
		children: Snippet;
		data: { containers: Container[]; facets: Record<string, Record<string, number>> };
		sortOptions?: [string, string][];
	}

	let { children, data, sortOptions }: Props = $props();

	setContext('relationOverlay', {
		enabled: true,
		predicates: [predicates.enum['is-prerequisite-for']]
	});

	let facets = $derived.by(() => {
		const facets = new Map([
			...((page.url.searchParams.has('related-to')
				? [
						[
							'relationType',
							new Map([
								[predicates.enum['is-part-of'], 0],
								[predicates.enum['is-prerequisite-for'], 0]
							])
						]
					]
				: []) as Array<[string, Map<string, number>]>),
			...((!page.data.currentOrganization.payload.default
				? [['included', new Map()]]
				: []) as Array<[string, Map<string, number>]>),
			['taskCategory', fromCounts(taskCategories.options, data.facets?.taskCategory)],
			['assignee', new Map()]
		]);

		if (!data.facets || Object.keys(data.facets).length === 0) {
			return computeFacetCount(facets, data.containers);
		}

		return facets;
	});
</script>

<Layout>
	{#snippet header()}
		<Header {facets} search {sortOptions} />
	{/snippet}

	{#snippet main()}
		{@render children()}
	{/snippet}
</Layout>
