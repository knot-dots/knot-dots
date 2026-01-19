<script lang="ts">
	import { setContext, type Snippet } from 'svelte';
	import { page } from '$app/state';
	import Header from '$lib/components/Header.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import { loadCategoryOptions, buildCategoryFacets, buildCategoryLabels } from '$lib/client/categoryOptions';
	import fetchContainers from '$lib/client/fetchContainers';
	import {
		computeFacetCount,
		isCategoryContainer,
		isGoalContainer,
		isMeasureContainer,
		isProgramContainer,
		isRuleContainer,
		isSimpleMeasureContainer,
		payloadTypes,
		predicates,
		programTypes,
	} from '$lib/models';

	import type { PageData } from '../../routes/[[guid=uuid]]/all/catalog/$types';

	interface Props {
		children: Snippet;
		data: PageData;
		filterBarInitiallyOpen?: boolean;
	}

	let { children, data, filterBarInitiallyOpen = false }: Props = $props();

	setContext('relationOverlay', {
		enabled: true,
		predicates: [
			predicates.enum['is-consistent-with'],
			predicates.enum['is-equivalent-to'],
			predicates.enum['is-inconsistent-with'],
			predicates.enum['contributes-to']
		]
	});

	let categoryFacets = $state(new Map<string, Map<string, number>>());
	let facetLabels = $state(new Map<string, string>());

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
		})();

		return () => {
			cancelled = true;
		};
	});

	let facets = $derived.by(() => {
		const entries: Array<[string, Map<string, number>]> = [];

		if (page.url.searchParams.has('related-to')) {
			entries.push([
				'relationType',
				new Map<string, number>([
					[predicates.enum['is-part-of'], 0],
					[predicates.enum['is-consistent-with'], 0],
					[predicates.enum['is-equivalent-to'], 0],
					[predicates.enum['is-inconsistent-with'], 0],
					[predicates.enum['contributes-to'], 0]
				])
			]);
		}

		if (!page.data.currentOrganization.payload.default) {
			entries.push(['included', new Map<string, number>()]);
		}

		for (const [key, values] of categoryFacets.entries()) {
			entries.push([key, new Map<string, number>(values.entries())]);
		}

		entries.push([
			'programType',
			new Map<string, number>(programTypes.options.map((v: string) => [v, 0]))
		]);

		return computeFacetCount(
			new Map(entries),
			data.containers.filter(
				(c) =>
					isGoalContainer(c) ||
					isMeasureContainer(c) ||
					isRuleContainer(c) ||
					isSimpleMeasureContainer(c) ||
					isProgramContainer(c)
			)
		);
	});
</script>

<Layout>
	{#snippet header()}
		<Header {filterBarInitiallyOpen} {facets} {facetLabels} search />
	{/snippet}

	{#snippet main()}
		{@render children()}
	{/snippet}
</Layout>
