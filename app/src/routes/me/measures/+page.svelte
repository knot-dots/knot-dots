<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import Measures from '$lib/components/Measures.svelte';
	import {
		buildCategoryFacets,
		buildCategoryLabels,
		loadCategoryOptions
	} from '$lib/client/categoryOptions';
	import fetchContainers from '$lib/client/fetchContainers';
	import { computeFacetCount, measureTypes, isCategoryContainer, payloadTypes } from '$lib/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const workspaceOptions = [
		{ label: $_('workspace.profile'), value: '/me' },
		{ label: $_('workspace.profile.tasks'), value: '/me/tasks' },
		{ label: $_('workspace.profile.measures'), value: '/me/measures' }
	];

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

			if (cancelled) return;
			categoryFacets = nextFacets;
			facetLabels = nextLabels;
		})();

		return () => {
			cancelled = true;
		};
	});

	let facets = $derived.by(() => {
		const entries: Array<[string, Map<string, number>]> = [];

		for (const [key, values] of categoryFacets.entries()) {
			entries.push([key, new Map(values.entries())]);
		}

		entries.push(['measureType', new Map(measureTypes.options.map((v) => [v as string, 0]))]);

		return computeFacetCount(new Map<string, Map<string, number>>(entries), data.containers);
	});
</script>

<Layout>
	{#snippet header()}
		<Header {facets} {facetLabels} search {workspaceOptions} />
	{/snippet}

	{#snippet main()}
		<Measures containers={data.containers} />
		<Help slug="measures-status" />
	{/snippet}
</Layout>
