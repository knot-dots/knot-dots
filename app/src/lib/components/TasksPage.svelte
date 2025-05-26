<script lang="ts">
	import { setContext, type Snippet } from 'svelte';
	import { page } from '$app/state';
	import Header from '$lib/components/Header.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import { computeFacetCount, type Container, predicates, taskCategories } from '$lib/models';

	interface Props {
		children: Snippet;
		data: { containers: Container[] };
	}

	let { children, data }: Props = $props();

	setContext('relationOverlay', {
		enabled: true,
		predicates: [predicates.enum['is-prerequisite-for'], predicates.enum['is-subtask-of']]
	});

	let facets = $derived.by(() => {
		const facets = new Map([
			...((page.url.searchParams.has('related-to')
				? [
						[
							'relationType',
							new Map([
								[predicates.enum['is-part-of'], 0],
								[predicates.enum['is-prerequisite-for'], 0],
								[predicates.enum['is-subtask-of'], 0]
							])
						]
					]
				: []) as Array<[string, Map<string, number>]>),
			...((!page.data.currentOrganization.payload.default
				? [['included', new Map()]]
				: []) as Array<[string, Map<string, number>]>),
			['taskCategory', new Map(taskCategories.options.map((v) => [v as string, 0]))],
			['assignee', new Map()]
		]);

		return computeFacetCount(facets, data.containers);
	});
</script>

<Layout>
	<Header {facets} search sortOptions={[]} slot="header" />

	<svelte:fragment slot="main">
		{@render children()}
	</svelte:fragment>
</Layout>
