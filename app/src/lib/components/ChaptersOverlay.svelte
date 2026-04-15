<script lang="ts">
	import { page } from '$app/state';
	import { buildCategoryFacetsWithCounts } from '$lib/categoryOptions';
	import Chapters from '$lib/components/Chapters.svelte';
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import { createFeatureDecisions } from '$lib/features';
	import {
		type AnyContainer,
		audience,
		computeFacetCount,
		type Container,
		isProgramContainer,
		policyFieldBNK,
		sustainableDevelopmentGoals,
		topics
	} from '$lib/models';

	interface Props {
		container: AnyContainer;
		containers: Container[];
	}

	let { container, containers }: Props = $props();

	let featureDecisions = $derived(createFeatureDecisions(page.data.features));
	let categoryContext = $derived(page.data.categoryContext);

	let facets = $derived(
		featureDecisions.useCustomCategories() && categoryContext
			? computeFacetCount(buildCategoryFacetsWithCounts(categoryContext.options), containers, {
					useCategoryPayload: true
				})
			: computeFacetCount(
					new Map([
						['audience', new Map(audience.options.map((v) => [v as string, 0]))],
						['sdg', new Map(sustainableDevelopmentGoals.options.map((v) => [v as string, 0]))],
						['topic', new Map(topics.options.map((v) => [v as string, 0]))],
						['policyFieldBNK', new Map(policyFieldBNK.options.map((v) => [v as string, 0]))]
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

<Chapters program={isProgramContainer(container) ? container : undefined} {containers} />

<Help slug="all-level" />
