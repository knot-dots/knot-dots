<script lang="ts">
	import { signIn, signOut } from '@auth/sveltekit/client';
	import { _ } from 'svelte-i18n';
	import {
		ArrowLeftOnRectangle,
		ArrowRightOnRectangle,
		BarsArrowDown,
		ChevronDown,
		ChevronLeft,
		ChevronRight,
		ChevronUp,
		Funnel,
		Icon,
		QuestionMarkCircle
	} from 'svelte-hero-icons';
	import { page } from '$app/stores';
	import { accountURL } from '$lib/authentication';
	import paramsFromURL from '$lib/client/paramsFromURL';
	import { filtersToggle, navigationToggle, sidebarToggle, sortToggle, user } from '$lib/stores';

	export let helpSlug: string = '';

	function helpURL(url: URL) {
		const newParams = new URLSearchParams(paramsFromURL(url));
		newParams.set('view-help', helpSlug);
		return `#${newParams.toString()}`;
	}

	function toggleSidebar() {
		$sidebarToggle = !$sidebarToggle;
		if (!$sidebarToggle) {
			$filtersToggle = false;
			$sortToggle = false;
		}
	}

	function toggleFilters() {
		$filtersToggle = !$filtersToggle;
		if ($filtersToggle) {
			$sidebarToggle = true;
		}
	}

	function toggleSort() {
		$sortToggle = !$sortToggle;
		if ($sortToggle) {
			$sidebarToggle = true;
		}
	}
</script>

<aside id="aside-0" class:is-expanded={$sidebarToggle} class:is-visible={$navigationToggle}>
	{#if $$slots.tabs}
		<ul class="group group-tabs">
			<slot name="tabs" />
		</ul>
	{/if}

	<ul class="group group-actions">
		{#if $$slots.search}
			<slot name="search" {toggleSidebar} />
		{/if}

		{#if $$slots.filters}
			<li>
				<button on:click={toggleFilters} aria-controls="filters" aria-expanded={$filtersToggle}>
					<Icon src={Funnel} size="20" mini />
					<span class:is-hidden={!$sidebarToggle}>{$_('filter')}</span>
					<span class:is-hidden={!$sidebarToggle}>
						<Icon src={$filtersToggle ? ChevronUp : ChevronDown} size="20" />
					</span>
				</button>
				<ul id="filters" class="collapsible masked-overflow" class:is-hidden={!$filtersToggle}>
					<slot name="filters" />
				</ul>
			</li>
		{/if}

		{#if $$slots.sort}
			<li>
				<button on:click={toggleSort} aria-controls="sort" aria-expanded={$sortToggle}>
					<Icon src={BarsArrowDown} size="20" mini />
					<span class:is-hidden={!$sidebarToggle}>{$_('sort')}</span>
					<span class:is-hidden={!$sidebarToggle}>
						<Icon src={$sortToggle ? ChevronUp : ChevronDown} size="20" />
					</span>
				</button>
				<ul id="sort" class="collapsible" class:is-hidden={!$sortToggle}>
					<slot name="sort" />
				</ul>
			</li>
		{/if}
	</ul>

	{#if helpSlug}
		<a class="help" href={helpURL($page.url)}>
			<Icon src={QuestionMarkCircle} size="20" mini />
			<span class:is-hidden={!$sidebarToggle}>{$_('help')}</span>
		</a>
	{/if}

	<ul class="group group-user-menu">
		{#if $user.isAuthenticated}
			<li>
				<a href={accountURL($page.url.href)}>
					<span class="avatar avatar-m">{$user.givenName.at(0)} {$user.familyName.at(0)}</span>
					<span class:is-hidden={!$sidebarToggle}>{$user.givenName} {$user.familyName}</span>
				</a>
			</li>
			<li>
				<button on:click={() => signOut()}>
					{#if !$sidebarToggle}
						<Icon src={ArrowRightOnRectangle} size="20" mini />
					{/if}
					<span class:is-hidden={!$sidebarToggle}>{$_('logout')}</span>
				</button>
			</li>
		{:else}
			<li>
				<button class="quiet" on:click={() => signIn('keycloak')}>
					{#if !$sidebarToggle}
						<Icon src={ArrowLeftOnRectangle} size="20" mini />
					{/if}
					<span class:is-hidden={!$sidebarToggle}>{$_('login')}</span>
				</button>
			</li>
		{/if}
	</ul>

	<ul class="group group-controls">
		<li>
			{#if $sidebarToggle}
				<button on:click={toggleSidebar} title={$_('collapse_sidebar')}>
					<Icon src={ChevronLeft} size="24" />
				</button>
			{:else}
				<button on:click={toggleSidebar} title={$_('expand_sidebar')}>
					<Icon src={ChevronRight} size="24" />
				</button>
			{/if}
		</li>
	</ul>
</aside>

<style>
	aside {
		border-right: solid 1px var(--color-gray-200);
		display: none;
		flex-direction: column;
		flex-shrink: 0;
		gap: 1rem;
		padding-bottom: 1rem;
		width: 4.75rem;
	}

	@media (min-width: 768px) {
		aside {
			display: flex;
		}
	}

	aside.is-visible {
		display: flex;
	}

	aside.is-expanded {
		width: 18rem;
	}

	aside > ul {
		padding: 1rem 0.75rem 0;
	}

	aside > ul:nth-child(n + 2) {
		border-top: solid 1px var(--color-gray-200);
	}

	button[aria-expanded='true'] {
		--button-background: var(--color-gray-400);
	}

	button[aria-controls] > span:last-child {
		margin-left: auto;
	}

	.group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	:global(.group > li a),
	:global(.group > li button) {
		--padding-x: 14px;
		--padding-y: 14px;
		align-items: center;
		display: flex;
		text-align: left;
	}

	.group.group-controls {
		flex-direction: row;
		flex: 0 0;
	}

	.group.group-controls li:last-child {
		margin-left: auto;
	}

	.group.group-controls button {
		--button-border-color: var(--color-primary);
		--padding-x: 12px;
		--padding-y: 12px;

		color: var(--color-primary);
	}

	.group.group-controls button:hover {
		--button-background: var(--gradient-primary);

		color: white;
	}

	.group.group-actions {
		flex: 1 0;
		min-height: 0;
	}

	.group.group-actions li {
		min-height: 0;
	}

	.group.group-actions > :first-child,
	.group.group-actions > :last-child {
		flex-shrink: 0;
		min-height: 0;
	}

	.group.group-tabs {
		flex-shrink: 0;
	}

	.group.group-user-menu {
		flex: 0 0;
	}

	@media (min-width: 768px) {
		.group.group-user-menu {
			display: none;
		}
	}

	.group.group-user-menu a {
		--padding-x: 0;
		justify-content: center;
	}

	.group.group-user-menu button {
		justify-content: center;
	}

	:global(aside.is-expanded .group-actions button),
	:global(aside.is-expanded .group-tabs .button),
	:global(aside.is-expanded .group-tabs button),
	aside.is-expanded .group-user-menu a,
	aside.is-expanded .group-user-menu button {
		--padding-x: 14px;
		--padding-y: 12px;
		gap: 0.5rem;
		width: 100%;
	}

	.help {
		align-items: center;
		border-bottom: solid 1px var(--color-gray-200);
		border-top: solid 1px var(--color-gray-200);
		display: flex;
		padding: 1rem 1.625rem;
		text-align: left;
	}

	aside.is-expanded .help {
		--padding-x: 14px;
		--padding-y: 12px;
		gap: 0.5rem;
		width: 100%;
	}

	.collapsible {
		--mask-height: 0.5rem;

		border-radius: 8px;
		box-shadow: var(--shadow-md);
		padding: 4px 17px 12px 12px;
		margin-top: 0.5rem;
		max-height: calc(100% - 4rem);
	}

	:global(.collapsible > li) {
		margin-bottom: 12px;
	}

	:global(.collapsible > li:last-child) {
		margin-bottom: 0;
	}
</style>
