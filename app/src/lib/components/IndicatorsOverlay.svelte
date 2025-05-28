<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import Indicators from '$lib/components/Indicators.svelte';
	import {
		audience,
		type Container,
		indicatorCategories,
		indicatorTypes,
		policyFieldBNK,
		sustainableDevelopmentGoals,
		topics
	} from '$lib/models';

	interface Props {
		containers: Container[];
	}

	let { containers }: Props = $props();

	const facets = new Map([
		['indicatorType', new Map(indicatorTypes.options.map((v) => [v as string, 0]))],
		['indicatorCategory', new Map(indicatorCategories.options.map((v) => [v as string, 0]))],
		['audience', new Map(audience.options.map((v) => [v as string, 0]))],
		['category', new Map(sustainableDevelopmentGoals.options.map((v) => [v as string, 0]))],
		['topic', new Map(topics.options.map((v) => [v as string, 0]))],
		['policyFieldBNK', new Map(policyFieldBNK.options.map((v) => [v as string, 0]))]
	]);
</script>

<Header {facets} search />

<Indicators {containers} />

<Help slug="indicators" />
