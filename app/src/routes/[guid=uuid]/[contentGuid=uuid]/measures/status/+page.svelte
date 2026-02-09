<script lang="ts">
	import Layout from '$lib/components/Layout.svelte';
	import type { PageProps } from './$types';
	import {
		audience,
		computeFacetCount,
		isMeasureContainer,
		isSimpleMeasureContainer,
		policyFieldBNK,
		predicates,
		sustainableDevelopmentGoals,
		topics
	} from '$lib/models';
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import Measures from '$lib/components/Measures.svelte';

	let { data }: PageProps = $props();

	let containers = $derived(data.containers);

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

<Layout>
	{#snippet header()}
		<Header {facets} search />
	{/snippet}

	{#snippet main()}
		<Measures {containers} />

		<Help slug="measures-status" />
	{/snippet}
</Layout>
