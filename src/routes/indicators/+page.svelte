<script lang="ts">
	import { Icon, Plus } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import AudienceFilter from '$lib/components/AudienceFilter.svelte';
	import Card from '$lib/components/Card.svelte';
	import IndicatorsIncludedFilter from '$lib/components/IndicatorsIncludedFilter.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import OrganizationTabs from '$lib/components/OrganizationTabs.svelte';
	import OrganizationalUnitTabs from '$lib/components/OrganizationalUnitTabs.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import {
		isOrganizationalUnitContainer,
		isOrganizationContainer,
		payloadTypes
	} from '$lib/models';
	import { ability } from '$lib/stores';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<Layout>
	<svelte:fragment slot="sidebar">
		{#if isOrganizationContainer(data.container)}
			<Sidebar helpSlug="indicators">
				<AudienceFilter slot="filters" />
			</Sidebar>
		{:else if isOrganizationalUnitContainer(data.container)}
			<Sidebar helpSlug="indicators">
				<svelte:fragment slot="filters">
					<IndicatorsIncludedFilter />
					<AudienceFilter />
				</svelte:fragment>
			</Sidebar>
		{/if}
	</svelte:fragment>

	<svelte:fragment slot="main">
		<div class="indicators">
			{#if $ability.can('create', payloadTypes.enum.indicator)}
				<p>
					<a class="button primary" href="#create={payloadTypes.enum.indicator}">
						<Icon src={Plus} size="20" mini />
						{$_('indicator')}
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
		flex: 1 1;
		overflow-x: auto;
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
