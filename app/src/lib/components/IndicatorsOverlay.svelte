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
	import { getContext } from 'svelte';

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

	let workspaceOptions = getContext<Array<{ label: string; value: string }>>('workspaceOptions');
</script>

<Header {facets} search {workspaceOptions} />

<Indicators {containers} />

<Help slug="indicators" />
