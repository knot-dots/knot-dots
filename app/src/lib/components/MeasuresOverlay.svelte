<script lang="ts">
	import { page } from '$app/state';
	import { buildCategoryFacetsWithCounts } from '$lib/categoryOptions';
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import Measures from '$lib/components/Measures.svelte';
	import { createFeatureDecisions } from '$lib/features';
	import {
		audience,
		computeFacetCount,
		isMeasureContainer,
		isSimpleMeasureContainer,
		type MeasureContainer,
		policyFieldBNK,
		predicates,
		sustainableDevelopmentGoals,
		topics
	} from '$lib/models';

	interface Props {
		containers: MeasureContainer[];
	}

	let { containers }: Props = $props();

	let featureDecisions = $derived(createFeatureDecisions(page.data.features));
	let categoryContext = $derived(page.data.categoryContext);

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
		featureDecisions.useCustomCategories() && categoryContext
			? (() => {
					const f = buildCategoryFacetsWithCounts(categoryContext.options);
					f.set('member', memberFacet);
					return computeFacetCount(f, containers, { useCategoryPayload: true });
				})()
			: computeFacetCount(
					new Map([
						['audience', new Map(audience.options.map((v) => [v as string, 0]))],
						['sdg', new Map(sustainableDevelopmentGoals.options.map((v) => [v as string, 0]))],
						['topic', new Map(topics.options.map((v) => [v as string, 0]))],
						['policyFieldBNK', new Map(policyFieldBNK.options.map((v) => [v as string, 0]))],
						['member', memberFacet]
					]),
					containers
				)
	);
</script>

<Header
	{facets}
	facetLabels={featureDecisions.useCustomCategories() && categoryContext
		? categoryContext.labels
		: undefined}
	categoryOptions={featureDecisions.useCustomCategories() && categoryContext
		? categoryContext.options
		: null}
	search
/>

<Measures {containers} />

<Help slug="measures-status" />
