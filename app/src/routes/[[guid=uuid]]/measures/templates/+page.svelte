<script lang="ts">
	import { onMount, setContext } from 'svelte';
	import { page } from '$app/state';
	import Card from '$lib/components/Card.svelte';
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import {
		loadCategoryOptions,
		buildCategoryFacets,
		buildCategoryLabels
	} from '$lib/client/categoryOptions';
	import fetchContainers from '$lib/client/fetchContainers';
	import {
		computeFacetCount,
		isCategoryContainer,
		measureTypes,
		payloadTypes,
		predicates
	} from '$lib/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	setContext('relationOverlay', {
		enabled: true,
		predicates: [
			predicates.enum['is-consistent-with'],
			predicates.enum['is-equivalent-to'],
			predicates.enum['is-inconsistent-with'],
			predicates.enum['is-prerequisite-for']
		]
	});

	const toFacetKey = (key: string) =>
		key === 'sdg' ? 'category' : key === 'policy_field_bnk' ? 'policyFieldBNK' : key;

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
			let nextFacets = buildCategoryFacets(options);
			let nextLabels = buildCategoryLabels(options);

			if (nextFacets.size === 0) {
				options = await loadCategoryOptions(categoryKeys, []);
				nextFacets = buildCategoryFacets(options);
				nextLabels = buildCategoryLabels(options);
			}

			const mappedFacets = new Map<string, Map<string, number>>();
			for (const [key, values] of nextFacets) {
				mappedFacets.set(toFacetKey(key), values);
			}

			const mappedLabels = new Map<string, string>();
			for (const [key, label] of nextLabels) {
				mappedLabels.set(toFacetKey(key), label);
			}

			if (cancelled) return;
			categoryFacets = mappedFacets;
			facetLabels = mappedLabels;
		})();

		return () => {
			cancelled = true;
		};
	});

	let facets = $derived.by(() => {
		const entries: Array<[string, Map<string, number>]> = [];

		if (!page.data.currentOrganization.payload.default) {
			entries.push(['included', new Map<string, number>()]);
		}

		for (const [key, values] of categoryFacets.entries()) {
			entries.push([key, new Map<string, number>(values.entries())]);
		}

		entries.push([
			'measureType',
			new Map<string, number>(measureTypes.options.map((v: string) => [v, 0]))
		]);

		return computeFacetCount(new Map(entries), data.containers);
	});
</script>

<Layout>
	{#snippet header()}
		<Header {facets} {facetLabels} search />
	{/snippet}

	{#snippet main()}
		<div>
			<ul>
				{#each data.containers as container (container.guid)}
					<li>
						<Card --height="100%" {container} />
					</li>
				{/each}
			</ul>
		</div>

		<Help slug="measures-templates" />
	{/snippet}
</Layout>

<style>
	div {
		height: 100%;
		overflow-y: auto;
		padding: 1.5rem;
	}

	ul {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: 1.5rem;
	}

	li {
		width: 19.5rem;
	}
</style>
