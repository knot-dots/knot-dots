<script lang="ts">
	import { signIn } from '@auth/sveltekit/client';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import OrganizationMenu from '$lib/components/OrganizationMenu.svelte';
	import { boards } from '$lib/models';
	import { applicationState, user } from '$lib/stores';
	import { Icon, Share } from 'svelte-hero-icons';

	$: selectedContext = $page.data.currentOrganizationalUnit ?? $page.data.currentOrganization;
</script>

<nav class:is-elevated={$applicationState.organizationMenu.showDropDown}>
	<OrganizationMenu />

	<div class="main-menu">
		<a href="/" class="button button-nav" class:is-active={$page.url.pathname === '/'}>
			<Icon src={Share} size="20" mini />
			{$_('board.elements')}
		</a>

		<ul class="button-group button-group-nav">
			{#if selectedContext.payload.boards.includes(boards.enum['board.indicators'])}
				<li>
					<a
						href="/indicators"
						class="button button-nav"
						class:is-active={$page.url.pathname === '/indicators'}
					>
						{$_('board.indicators')}
					</a>
				</li>
			{/if}
			<li>
				<a
					href="/programs"
					class="button button-nav"
					class:is-active={$page.url.pathname === '/programs'}
				>
					{$_('board.programs')}
				</a>
			</li>
			<li>
				<a
					href="/implementation"
					class="button button-nav"
					class:is-active={$page.url.pathname === '/implementation'}
				>
					{$_('board.implementation')}
				</a>
			</li>
			{#if !$page.data.currentOrganization.payload.default}
				<li>
					<a
						href="/tasks"
						class="button button-nav"
						class:is-active={$page.url.pathname === '/tasks'}
					>
						{$_('tasks')}
					</a>
				</li>
			{/if}
		</ul>
	</div>

	<ul class="user-menu" class:is-authenticated={$user.isAuthenticated}>
		{#if $user.isAuthenticated}
			<li>
				<a href="/profile">
					<span
						class="avatar avatar-s button button-nav"
						class:is-active={$page.url.pathname === '/profile'}
					>
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
		display: flex;
		font-size: 0.875rem;
		gap: 0.5rem;
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
		gap: 2rem;
		margin: 0 auto;
		overflow-x: auto;
	}

	.main-menu > a {
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

	@media (min-width: 1024px) {
		.main-menu {
			margin: 0 auto 0 calc((100vw - var(--organization-menu-max-width)) * 0.1);
		}
	}
</style>
