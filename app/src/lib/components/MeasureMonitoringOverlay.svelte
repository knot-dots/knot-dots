<script lang="ts">
	import { page } from '$app/state';
	import { buildCategoryFacetsWithCounts } from '$lib/categoryOptions';
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import MeasureMonitoring from '$lib/components/MeasureMonitoring.svelte';
	import { createFeatureDecisions } from '$lib/features';
	import {
		type AnyContainer,
		audience,
		computeFacetCount,
		type Container,
		isIndicatorTemplateContainer,
		isMeasureContainer,
		isMeasureMonitoringContainer,
		isSimpleMeasureContainer,
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

	let measures = $derived(
		isMeasureContainer(container) || isSimpleMeasureContainer(container)
			? [container]
			: containers.filter((c) => isMeasureContainer(c) || isSimpleMeasureContainer(c))
	);

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

<MeasureMonitoring
	measure={isMeasureContainer(container) || isSimpleMeasureContainer(container)
		? container
		: undefined}
	{measures}
	containers={containers.filter(isMeasureMonitoringContainer)}
	indicators={containers.filter(isIndicatorTemplateContainer)}
	showMeasures={!isMeasureContainer(container) && !isSimpleMeasureContainer(container)}
/>

<Help slug="measures-monitoring" />
