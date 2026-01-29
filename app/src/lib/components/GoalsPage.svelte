<script lang="ts">
	import { setContext, type Snippet } from 'svelte';
	import { page } from '$app/state';
	import Header from '$lib/components/Header.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import fetchContainers from '$lib/client/fetchContainers';
	import {
		loadCategoryOptions,
		buildCategoryFacets,
		buildCategoryLabels,
		type CategoryOptions
	} from '$lib/client/categoryOptions';
	import { createFeatureDecisions } from '$lib/features';
	import {
		audience,
		computeFacetCount,
		isCategoryContainer,
		policyFieldBNK,
		payloadTypes,
		predicates,
		programTypes,
		sustainableDevelopmentGoals,
		topics
	} from '$lib/models';

	import type { PageData } from '../../routes/[guid=uuid]/goals/catalog/$types';

	interface Props {
		children: Snippet;
		data: PageData;
		filterBarInitiallyOpen?: boolean;
	}

	let { children, data, filterBarInitiallyOpen = false }: Props = $props();

	const featureDecisions = createFeatureDecisions(page.data.features ?? []);

	setContext('relationOverlay', {
		enabled: true,
		predicates: [
			predicates.enum['is-consistent-with'],
			predicates.enum['is-equivalent-to'],
			predicates.enum['is-inconsistent-with']
		]
	});

	let categoryFacets = $state(new Map<string, Map<string, number>>());
	let facetLabels = $state(new Map<string, string>());
	let categoryOptions: CategoryOptions | null = $state(null);

	$effect(() => {
		if (!featureDecisions.useCustomCategories()) {
			categoryFacets = new Map();
			facetLabels = new Map();
			categoryOptions = null;
			return;
		}

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

		if (page.url.searchParams.has('related-to')) {
			entries.push([
				'relationType',
				new Map<string, number>([
					[predicates.enum['is-part-of'], 0],
					[predicates.enum['is-consistent-with'], 0],
					[predicates.enum['is-equivalent-to'], 0],
					[predicates.enum['is-inconsistent-with'], 0]
				])
			]);
		}

		if (!page.data.currentOrganization.payload.default) {
			entries.push(['included', new Map<string, number>()]);
		}

		if (featureDecisions.useCustomCategories()) {
			for (const [key, values] of categoryFacets.entries()) {
				entries.push([key, new Map<string, number>(values.entries())]);
			}
		} else {
			entries.push([
				'category',
				new Map<string, number>(sustainableDevelopmentGoals.options.map((v) => [v as string, 0]))
			]);
			entries.push(['topic', new Map<string, number>(topics.options.map((v) => [v as string, 0]))]);
			entries.push([
				'policyFieldBNK',
				new Map<string, number>(policyFieldBNK.options.map((v) => [v as string, 0]))
			]);
			entries.push([
				'audience',
				new Map<string, number>(audience.options.map((v) => [v as string, 0]))
			]);
		}

		entries.push([
			'programType',
			new Map<string, number>(programTypes.options.map((v) => [v as string, 0]))
		]);

		const facets = new Map<string, Map<string, number>>(entries);

		return computeFacetCount(facets, data.containers);
	});
</script>

<Layout>
	{#snippet header()}
		<Header
			{filterBarInitiallyOpen}
			{facets}
			facetLabels={featureDecisions.useCustomCategories() ? facetLabels : undefined}
			categoryOptions={featureDecisions.useCustomCategories() ? categoryOptions : null}
			search
		/>
	{/snippet}

	{#snippet main()}
		{@render children()}
	{/snippet}
</Layout>
