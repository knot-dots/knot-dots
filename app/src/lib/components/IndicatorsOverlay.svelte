<script lang="ts">
	import { page } from '$app/state';
	import { buildCategoryFacetsWithCounts, filterCategoryContext } from '$lib/categoryOptions';
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import NewIndicators from '$lib/components/NewIndicators.svelte';
	import {
		computeFacetCount,
		type Container,
		indicatorCategories,
		indicatorTypes,
		payloadTypes
	} from '$lib/models';

	interface Props {
		containers: Container[];
	}

	let { containers }: Props = $props();

	let facets = $derived(
		computeFacetCount(
			new Map([
				...buildCategoryFacetsWithCounts(
					filterCategoryContext(page.data.categoryContext, [payloadTypes.enum.indicator_template])
						.options
				),
				['indicatorType', new Map(indicatorTypes.options.map((v) => [v as string, 0]))],
				['indicatorCategory', new Map(indicatorCategories.options.map((v) => [v as string, 0]))]
			]),
			containers
		)
	);
</script>

<Header {facets} search />

<NewIndicators {containers} />

<Help slug="indicators" />
