<script lang="ts">
	import Measures from '$lib/components/Measures.svelte';
	import Navigation from '$lib/components/Navigation.svelte';
	import {
		audience,
		type MeasureContainer,
		measureTypes,
		policyFieldBNK,
		sustainableDevelopmentGoals,
		topics
	} from '$lib/models';
	import { getContext } from 'svelte';

	interface Props {
		containers: MeasureContainer[];
	}

	let { containers }: Props = $props();

	const facets = new Map([
		['audience', new Map(audience.options.map((v) => [v as string, 0]))],
		['category', new Map(sustainableDevelopmentGoals.options.map((v) => [v as string, 0]))],
		['topic', new Map(topics.options.map((v) => [v as string, 0]))],
		['policyFieldBNK', new Map(policyFieldBNK.options.map((v) => [v as string, 0]))],
		['measureType', new Map(measureTypes.options.map((v) => [v as string, 0]))]
	]);

	let workspaceOptions = getContext<Array<{ label: string; value: string }>>('workspaceOptions');
</script>

<Navigation {facets} search {workspaceOptions} />

<Measures {containers} />
