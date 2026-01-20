<script lang="ts">
	import { type Snippet } from 'svelte';
	import { page } from '$app/state';
	import Header from '$lib/components/Header.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import {
		loadCategoryOptions,
		buildCategoryFacets,
		buildCategoryLabels,
		type CategoryOptions
	} from '$lib/client/categoryOptions';
	import fetchContainers from '$lib/client/fetchContainers';
	import { computeFacetCount, isCategoryContainer, payloadTypes } from '$lib/models';

	import type { PageData } from '../../routes/[[guid=uuid]]/knowledge/catalog/$types';

	interface Props {
		children: Snippet;
		data: PageData;
		filterBarInitiallyOpen?: boolean;
	}

	let { children, data, filterBarInitiallyOpen = false }: Props = $props();

	let categoryFacets = $state(new Map<string, Map<string, number>>());
	let facetLabels = $state(new Map<string, string>());
	let categoryOptions: CategoryOptions | null = $state(null);

	$effect(() => {
		const organizationScope = Array.from(
			new Set(
				[page.data.currentOrganization?.guid, page.data.defaultOrganizationGuid].filter(
					(guid): guid is string => Boolean(guid)
				)
			)
		);

		let cancelled = false;
		(async () => {
			const [scopedCategories, fallbackCategories] = await Promise.all([
				fetchContainers(
					{ organization: organizationScope, payloadType: [payloadTypes.enum.category] },
					'alpha'
				),
				fetchContainers({ payloadType: [payloadTypes.enum.category] }, 'alpha')
			]);

			if (cancelled) return;

			const categoryKeys = Array.from(
				new Set(
					[...scopedCategories, ...fallbackCategories]
						.filter(isCategoryContainer)
						.map(({ payload }) => payload.key)
						.filter((key): key is string => Boolean(key))
				)
			);

			let options = await loadCategoryOptions(categoryKeys, organizationScope);
			let next = buildCategoryFacets(options);
			let nextLabels = buildCategoryLabels(options);

			if (next.size === 0) {
				options = await loadCategoryOptions(categoryKeys, []);
				next = buildCategoryFacets(options);
				nextLabels = buildCategoryLabels(options);
			}

			if (cancelled) return;
			categoryFacets = next;
			facetLabels = nextLabels;
			categoryOptions = options;
		})();

		return () => {
			cancelled = true;
		};
	});

	let facets = $derived.by(() => {
		const entries: Array<[string, Map<string, number>]> = [];

		for (const [key, values] of categoryFacets.entries()) {
			entries.push([key, new Map<string, number>(values.entries())]);
		}

		return computeFacetCount(new Map(entries), data.containers);
	});
</script>

<Layout>
	{#snippet header()}
		<Header {filterBarInitiallyOpen} {facets} {facetLabels} {categoryOptions} search />
	{/snippet}

	{#snippet main()}
		{@render children()}
	{/snippet}
</Layout>
