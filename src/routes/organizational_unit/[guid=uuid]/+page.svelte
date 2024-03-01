<script lang="ts">
	import { Icon, Pencil } from 'svelte-hero-icons';
	import Layout from '$lib/components/Layout.svelte';
	import OrganizationDetailView from '$lib/components/OrganizationDetailView.svelte';
	import OrganizationalUnitTabs from '$lib/components/OrganizationalUnitTabs.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { ability } from '$lib/stores';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<Layout>
	<Sidebar helpSlug="organizational-unit-view" slot="sidebar">
		<OrganizationalUnitTabs container={data.container} slot="tabs" />
		<svelte:fragment slot="extra">
			{#if $ability.can('update', data.container)}
				<li>
					<a
						href="{data.container.guid}/edit"
						class="button button-nav button-square"
						data-sveltekit-replacestate
					>
						<Icon solid src={Pencil} size="20" />
					</a>
				</li>
			{/if}
		</svelte:fragment>
	</Sidebar>

	<svelte:fragment slot="main">
		<div class="organization">
			<div class="detail-page-content organization-inner">
				<div class="content-details masked-overflow">
					<OrganizationDetailView
						container={data.container}
						indicators={data.indicators}
						measures={data.measures}
						strategies={data.strategies}
					/>
				</div>
			</div>
		</div>
	</svelte:fragment>
</Layout>

<style>
	.organization {
		flex: 1 1;
		overflow-x: auto;
	}

	.organization-inner {
		min-width: calc(100vw - 20rem);
		overflow-y: auto;
	}
</style>
