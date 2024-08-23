<script lang="ts">
	import { _ } from 'svelte-i18n';
	import PlusSmall from '~icons/heroicons/plus-small-solid';
	import Layout from '$lib/components/Layout.svelte';
	import OrganizationCard from '$lib/components/OrganizationCard.svelte';
	import OrganizationCategoryFilter from '$lib/components/OrganizationCategoryFilter.svelte';
	import Search from '$lib/components/Search.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Sort from '$lib/components/Sort.svelte';
	import { payloadTypes } from '$lib/models';
	import { ability } from '$lib/stores';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<Layout>
	<Sidebar helpSlug="organizations" slot="sidebar">
		<Search slot="search" />
		<svelte:fragment slot="filters">
			<OrganizationCategoryFilter />
		</svelte:fragment>
		<Sort slot="sort" />
	</Sidebar>
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
		flex: 1 1;
		margin: 1.5rem;
		overflow: auto;
	}

	p {
		margin-bottom: 1.5rem;
	}

	ul {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: 1.5rem;
		min-width: calc(100vw - 3.5rem);
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
