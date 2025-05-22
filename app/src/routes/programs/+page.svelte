<script lang="ts">
	import { setContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import PlusSmall from '~icons/heroicons/plus-small-solid';
	import Card from '$lib/components/Card.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import Navigation from '$lib/components/Navigation.svelte';
	import {
		audience,
		computeFacetCount,
		payloadTypes,
		policyFieldBNK,
		predicates,
		strategyTypes,
		sustainableDevelopmentGoals,
		topics
	} from '$lib/models';
	import { mayCreateContainer } from '$lib/stores';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	setContext('relationOverlay', {
		enabled: true,
		predicates: [
			predicates.enum['is-consistent-with'],
			predicates.enum['is-equivalent-to'],
			predicates.enum['is-inconsistent-with'],
			predicates.enum['is-superordinate-of']
		]
	});

	let facets = $derived.by(() => {
		const facets = new Map([
			['audience', new Map(audience.options.map((v) => [v as string, 0]))],
			['category', new Map(sustainableDevelopmentGoals.options.map((v) => [v as string, 0]))],
			['topic', new Map(topics.options.map((v) => [v as string, 0]))],
			['policyFieldBNK', new Map(policyFieldBNK.options.map((v) => [v as string, 0]))],
			['strategyType', new Map(strategyTypes.options.map((v) => [v as string, 0]))]
		]);

		return computeFacetCount(facets, data.containers);
	});
</script>

<Layout>
	<Navigation {facets} search slot="header" />

	<svelte:fragment slot="main">
		<div>
			{#if $mayCreateContainer(payloadTypes.enum.strategy, data.currentOrganizationalUnit?.guid ?? data.currentOrganization.guid)}
				<p>
					<a class="button primary" href="#create={payloadTypes.enum.strategy}">
						<PlusSmall />
						{$_('strategy')}
					</a>
				</p>
			{/if}
			<ul>
				{#each data.containers as container}
					<li>
						<Card --height="100%" {container} />
					</li>
				{/each}
			</ul>
		</div>
	</svelte:fragment>
</Layout>

<style>
	div {
		overflow-y: auto;
		padding: 1.5rem;
	}

	p {
		margin-bottom: 1.5rem;
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

	.button {
		align-items: center;
		display: inline-flex;
		gap: 0.5rem;
	}
</style>
