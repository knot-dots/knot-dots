<script lang="ts">
	import { setContext } from 'svelte';
	import { page } from '$app/state';
	import Card from '$lib/components/Card.svelte';
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import {
		audience,
		computeFacetCount,
		measureTypes,
		policyFieldBNK,
		predicates,
		sustainableDevelopmentGoals,
		topics
	} from '$lib/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	setContext('relationOverlay', {
		enabled: true,
		predicates: [
			predicates.enum['is-consistent-with'],
			predicates.enum['is-equivalent-to'],
			predicates.enum['is-inconsistent-with'],
			predicates.enum['is-prerequisite-for']
		]
	});

	let facets = $derived.by(() => {
		const facets = new Map([
			...((!page.data.currentOrganization.payload.default
				? [['included', new Map()]]
				: []) as Array<[string, Map<string, number>]>),
			['audience', new Map(audience.options.map((v) => [v as string, 0]))],
			['category', new Map(sustainableDevelopmentGoals.options.map((v) => [v as string, 0]))],
			['topic', new Map(topics.options.map((v) => [v as string, 0]))],
			['policyFieldBNK', new Map(policyFieldBNK.options.map((v) => [v as string, 0]))],
			['measureType', new Map(measureTypes.options.map((v) => [v as string, 0]))]
		]);

		return computeFacetCount(facets, data.containers);
	});
</script>

<Layout>
	{#snippet header()}
		<Header {facets} search />
	{/snippet}

	{#snippet main()}
		<div>
			<ul>
				{#each data.containers as container (container.guid)}
					<li>
						<Card --height="100%" {container} />
					</li>
				{/each}
			</ul>
		</div>

		<Help slug="measures-templates" />
	{/snippet}
</Layout>

<style>
	div {
		height: 100%;
		overflow-y: auto;
		padding: 1.5rem;
	}

	ul {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: 1.5rem;
	}

	li {
		width: 19.5rem;
	}
</style>
