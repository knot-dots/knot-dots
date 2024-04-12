<script lang="ts">
	import { signIn } from '@auth/sveltekit/client';
	import { _ } from 'svelte-i18n';
	import Share from '~icons/heroicons/share-20-solid';
	import Effects from '~icons/knotdots/effects';
	import Measure from '~icons/knotdots/measure';
	import Members from '~icons/knotdots/members';
	import Programs from '~icons/knotdots/programs';
	import { page } from '$app/stores';
	import OrganizationMenu from '$lib/components/OrganizationMenu.svelte';
	import { boards } from '$lib/models';
	import { ability, applicationState, user } from '$lib/stores';

	$: selectedContext = $page.data.currentOrganizationalUnit ?? $page.data.currentOrganization;
</script>

<nav class:is-elevated={$applicationState.organizationMenu.showDropDown}>
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

		<ul class="button-group button-group-nav">
			<li>
				<a
					href="/programs"
					class="button button-nav"
					class:is-active={$page.url.pathname === '/programs'}
					title={$_('board.programs')}
				>
					<span class="small-only"><Programs /></span>
					<span class="large-only">{$_('board.programs')}</span>
				</a>
			</li>
			<li>
				<a
					href="/implementation"
					class="button button-nav"
					class:is-active={$page.url.pathname === '/implementation' ||
						$page.url.pathname === '/tasks'}
					title={$_('board.implementation')}
				>
					<span class="small-only"><Measure /></span>
					<span class="large-only">{$_('board.implementation')}</span>
				</a>
			</li>
			{#if selectedContext.payload.boards.includes(boards.enum['board.indicators'])}
				<li>
					<a
						href="/indicators"
						class="button button-nav"
						class:is-active={$page.url.pathname === '/indicators'}
						title={$_('board.indicators')}
					>
						<span class="small-only"><Effects /></span>
						<span class="large-only">{$_('board.indicators')}</span>
					</a>
				</li>
			{/if}
		</ul>
	</div>

	{#if $page.data.currentOrganizationalUnit && $ability.can('update', $page.data.currentOrganizationalUnit)}
		<a
			href="/organization/{$page.data.currentOrganizationalUnit.guid}/members"
			class="button button-nav"
			class:is-active={$page.url.pathname ===
				`/organization/${$page.data.currentOrganizationalUnit.guid}/members`}
		>
			<span class="small-only"><Members /></span>
			<span class="large-only">{$_('members')}</span>
		</a>
	{:else if !$page.data.currentOrganization.payload.default && $ability.can('update', $page.data.currentOrganization)}
		<a
			href="/organizational_unit/{$page.data.currentOrganization.guid}/members"
			class="button button-nav"
			class:is-active={$page.url.pathname ===
				`/organizational_unit/${$page.data.currentOrganization.guid}/members`}
			title={$_('members')}
		>
			<span class="small-only"><Members /></span>
			<span class="large-only">{$_('members')}</span>
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
		overflow-x: auto;
	}

	.main-menu > a {
		flex-shrink: 0;
	}

	.button-group {
		flex-shrink: 1;
		margin: 0 auto;
		overflow-x: auto;
	}

	.user-menu {
		gap: 1rem;
	}

	.user-menu.is-authenticated {
		align-items: center;
		display: flex;
		gap: 0.75rem;
	}

	.large-only {
		display: none;
	}

	@container (min-inline-size: 50rem) {
		.main-menu {
			gap: 2rem;
		}

		.large-only {
			display: inherit;
		}

		.small-only {
			display: none;
		}
	}
</style>
