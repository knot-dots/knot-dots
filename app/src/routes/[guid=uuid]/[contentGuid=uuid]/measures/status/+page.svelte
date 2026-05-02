<script lang="ts">
	import { page } from '$app/state';
	import { buildCategoryFacetsWithCounts, filterCategoryContext } from '$lib/categoryOptions';
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import Measures from '$lib/components/Measures.svelte';
	import withOptimistic from '$lib/client/withOptimistic';
	import {
		computeFacetCount,
		isMeasureContainer,
		isSimpleMeasureContainer,
		payloadTypes,
		predicates
	} from '$lib/models';
	import { lastCreatedContainer } from '$lib/stores';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let containers = $derived(withOptimistic(data.containers, $lastCreatedContainer));

	let categoryContext = $derived(
		filterCategoryContext(page.data.categoryContext, [
			payloadTypes.enum.measure,
			payloadTypes.enum.simple_measure
		])
	);

	let memberFacet = $derived(
		containers
			.filter((c) => isMeasureContainer(c) || isSimpleMeasureContainer(c))
			.flatMap(({ user }) =>
				user
					.filter(({ predicate }) => predicate == predicates.enum['is-member-of'])
					.map(({ subject }) => subject)
			)
			.reduce((accumulator, currentValue) => {
				if (accumulator.has(currentValue)) {
					accumulator.set(currentValue, accumulator.get(currentValue)! + 1);
				} else {
					accumulator.set(currentValue, 1);
				}
				return accumulator;
			}, new Map())
	);

	let facets = $derived(
		computeFacetCount(
			new Map([...buildCategoryFacetsWithCounts(categoryContext.options), ['member', memberFacet]]),
			containers
		)
	);
</script>

<Layout>
	{#snippet header()}
		<Header {facets} search />
	{/snippet}

	{#snippet main()}
		<Measures {containers} />

		<Help slug="measures-status" />
	{/snippet}
</Layout>
