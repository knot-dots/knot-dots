<script lang="ts">
	import { Icon, Plus } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import { browser } from '$app/environment';
	import Layout from '$lib/components/Layout.svelte';
	import OrganizationCard from '$lib/components/OrganizationCard.svelte';
	import OrganizationCategoryFilter from '$lib/components/OrganizationCategoryFilter.svelte';
	import Overlay from '$lib/components/Overlay.svelte';
	import Search from '$lib/components/Search.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Sort from '$lib/components/Sort.svelte';
	import { payloadTypes } from '$lib/models';
	import { ability, overlay } from '$lib/stores';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<Layout>
	<Sidebar helpSlug="organizations" slot="sidebar">
		<Search slot="search" let:toggleSidebar on:click={toggleSidebar}></Search>
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
						<Icon src={Plus} size="20" mini />
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
		{#if browser && $overlay.revisions.length > 0}
			<Overlay {...$overlay} />
		{/if}
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
		min-width: calc(100vw - (18rem + 1px + 3rem));
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
