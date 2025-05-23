<script lang="ts">
	import { _ } from 'svelte-i18n';
	import PlusSmall from '~icons/heroicons/plus-small-solid';
	import Header from '$lib/components/Header.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import OrganizationCard from '$lib/components/OrganizationCard.svelte';
	import { computeFacetCount, organizationCategories, payloadTypes } from '$lib/models';
	import { ability } from '$lib/stores';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let facets = $derived.by(() => {
		const facets = new Map([
			['organizationCategory', new Map(organizationCategories.options.map((v) => [v as string, 0]))]
		]);

		return computeFacetCount(facets, data.containers);
	});
</script>

<Layout>
	<Header {facets} search slot="header" />

	<svelte:fragment slot="main">
		<div>
			{#if $ability.can('create', payloadTypes.enum.organization)}
				<p>
					<a class="button primary" href="#create={payloadTypes.enum.organization}">
						<PlusSmall />
						{$_('organization')}
					</a>
				</p>
			{/if}
			<ul>
				{#each data.containers as container}
					<li>
						<OrganizationCard --height="100%" {container} />
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
