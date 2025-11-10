<script lang="ts">
	import { setContext, type Snippet } from 'svelte';
	import { page } from '$app/state';
	import Header from '$lib/components/Header.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import { computeFacetCount, type Container, predicates, taskCategories } from '$lib/models';

	interface Props {
		children: Snippet;
		data: { containers: Container[]; facets?: Record<string, Record<string, number>> };
		sortOptions?: [string, string][];
	}

	let { children, data, sortOptions }: Props = $props();

	setContext('relationOverlay', {
		enabled: true,
		predicates: [predicates.enum['is-prerequisite-for'], predicates.enum['is-subtask-of']]
	});

	// Prefer server-provided ES facet counts for taskCategory if present; synthesize others locally.
	let facets = $derived.by(() => {
		function fromCounts(options: string[], counts?: Record<string, number>) {
			const m = new Map<string, number>();
			for (const opt of options) m.set(opt, Math.max(0, counts?.[opt] ?? 0));
			if (counts) {
				for (const [k, v] of Object.entries(counts)) if (!m.has(k)) m.set(k, v);
			}
			return m;
		}
		if (data.facets && Object.keys(data.facets).length > 0) {
			const m = new Map<string, Map<string, number>>([
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
				['taskCategory', fromCounts(taskCategories.options as string[], data.facets.taskCategory)],
				['assignee', new Map()]
			]);
			return m;
		}
		const m = new Map([
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
		return computeFacetCount(m, data.containers);
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
