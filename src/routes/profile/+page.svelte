<script lang="ts">
	import { signOut } from '@auth/sveltekit/client';
	import { _ } from 'svelte-i18n';
	import ArrowRightOnRectangle from '~icons/heroicons/arrow-right-on-rectangle-20-solid';
	import Cog6Tooth from '~icons/heroicons/cog-6-tooth-20-solid';
	import Info from '~icons/knotdots/info';
	import { page } from '$app/stores';
	import { accountURL } from '$lib/authentication';
	import Layout from '$lib/components/Layout.svelte';
	import ProfileView from '$lib/components/ProfileView.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import SidebarTab from '$lib/components/SidebarTab.svelte';
	import { user } from '$lib/stores';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<Layout>
	<Sidebar helpSlug="profile" slot="sidebar">
		<svelte:fragment slot="tabs">
			<SidebarTab href="/profile" iconSource={Info} text={$_('information')} />
			<SidebarTab
				href={accountURL($page.url.href)}
				iconSource={Cog6Tooth}
				text={$_('profile.settings')}
			/>
			<li>
				<button class="button-nav button-square" title={$_('logout')} on:click={() => signOut()}>
					<ArrowRightOnRectangle />
				</button>
			</li>
		</svelte:fragment>
	</Sidebar>

	<svelte:fragment slot="main">
		<div class="profile">
			<div class="detail-page-content profile-inner">
				<header class="content-header">
					<h2>
						{$user.givenName}
						{$user.familyName}
					</h2>
				</header>
				<div class="content-details masked-overflow">
					<ProfileView
						containers={data.containers}
						organizations={data.organizations}
						organizationalUnits={data.organizationalUnits}
					/>
				</div>
			</div>
		</div>
	</svelte:fragment>
</Layout>

<style>
	.profile {
		flex: 1 1;
		overflow-x: auto;
	}

	.profile-inner {
		min-width: calc(100vw - 20rem);
		overflow-y: auto;
	}
</style>
