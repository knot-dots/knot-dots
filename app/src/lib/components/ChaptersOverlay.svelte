<script lang="ts">
	import Chapters from '$lib/components/Chapters.svelte';
	import Header from '$lib/components/Header.svelte';
	import {
		audience,
		type Container,
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
		['audience', new Map(audience.options.map((v) => [v as string, 0]))],
		['category', new Map(sustainableDevelopmentGoals.options.map((v) => [v as string, 0]))],
		['topic', new Map(topics.options.map((v) => [v as string, 0]))],
		['policyFieldBNK', new Map(policyFieldBNK.options.map((v) => [v as string, 0]))]
	]);

	let workspaceOptions = getContext<Array<{ label: string; value: string }>>('workspaceOptions');
</script>

<Header {facets} search {workspaceOptions} />

<Chapters {containers} />
