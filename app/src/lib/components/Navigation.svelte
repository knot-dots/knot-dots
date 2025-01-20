<script lang="ts">
	import { signIn } from '@auth/sveltekit/client';
	import { _ } from 'svelte-i18n';
	import Share from '~icons/heroicons/share-20-solid';
	import Members from '~icons/knotdots/members';
	import { page } from '$app/stores';
	import OrganizationMenu from '$lib/components/OrganizationMenu.svelte';
	import { popover } from '$lib/components/OrganizationMenu.svelte';
	import Workspaces from '$lib/components/Workspaces.svelte';
	import { boards } from '$lib/models';
	import { ability, user } from '$lib/stores';

	$: selectedContext = $page.data.currentOrganizationalUnit ?? $page.data.currentOrganization;
</script>

<nav class:is-elevated={$popover.expanded} data-sveltekit-preload-data="hover">
	<OrganizationMenu />

	<div class="main-menu">
		<a
			href="/"
			class="button button-nav"
			class:is-active={$page.url.pathname === '/'}
			title={$_('board.elements')}
		>
			<Share />
			<span class="large-only">{$_('board.elements')}</span>
		</a>

		<Workspaces
			indicators={selectedContext.payload.boards.includes(boards.enum['board.indicators'])}
			tasks={!('default' in selectedContext.payload) || !selectedContext.payload.default}
		/>
	</div>

	{#if $page.data.currentOrganizationalUnit && $ability.can('invite-members', $page.data.currentOrganizationalUnit)}
		<a
			href="/organization/{$page.data.currentOrganizationalUnit.guid}/members"
			class="button button-nav"
			class:is-active={$page.url.pathname ===
				`/organization/${$page.data.currentOrganizationalUnit.guid}/members`}
			title={$_('members')}
		>
			<Members />
		</a>
	{:else if !$page.data.currentOrganization.payload.default && $ability.can('invite-members', $page.data.currentOrganization)}
		<a
			href="/organizational_unit/{$page.data.currentOrganization.guid}/members"
			class="button button-nav"
			class:is-active={$page.url.pathname ===
				`/organizational_unit/${$page.data.currentOrganization.guid}/members`}
			title={$_('members')}
		>
			<Members />
		</a>
	{:else}
		<span></span>
	{/if}

	<ul class="user-menu" class:is-authenticated={$user.isAuthenticated}>
		{#if $user.isAuthenticated}
			<li>
				<a href="#profile={$user.guid}">
					<span class="avatar avatar-s button button-nav">
						{$user.givenName.at(0)}{$user.familyName.at(0)}
					</span>
				</a>
			</li>
		{:else}
			<li>
				<button class="button-nav fully-rounded" type="button" on:click={() => signIn('keycloak')}>
					{$_('login')}
				</button>
			</li>
		{/if}
	</ul>
</nav>

<style>
	nav {
		align-items: center;
		background: white;
		container-type: inline-size;
		display: flex;
		font-size: 0.875rem;
		gap: 0.5rem;
		justify-content: space-between;
		height: var(--nav-height);
		padding: 0 1rem;
		position: absolute;
		width: 100%;
		z-index: 2;
	}

	nav > * {
		margin: 0;
	}

	.is-elevated {
		z-index: 4;
	}

	.main-menu {
		display: flex;
		flex-grow: 0;
		gap: 0.5rem;
	}

	.button.button-nav {
		flex-shrink: 0;
	}

	.user-menu {
		gap: 1rem;
	}

	.user-menu.is-authenticated {
		align-items: center;
		display: flex;
		gap: 0.75rem;
	}

	@container (min-inline-size: 50rem) {
		.main-menu {
			gap: 2rem;
		}

		.large-only {
			display: inherit;
		}
	}
</style>
