<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Icon, ChevronDown, ChevronUp } from 'svelte-hero-icons';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import ChevronLeftIcon from '$lib/icons/ChevronLeftIcon.svelte';
	import ChevronRightIcon from '$lib/icons/ChevronRightIcon.svelte';
	import FilterIcon from '$lib/icons/FilterIcon.svelte';
	import LoginIcon from '$lib/icons/LoginIcon.svelte';
	import LogoutIcon from '$lib/icons/LogoutIcon.svelte';
	import MapIcon from '$lib/icons/MapIcon.svelte';
	import QuestionMarkCircleIcon from '$lib/icons/QuestionMarkCircleIcon.svelte';
	import RegisterIcon from '$lib/icons/RegisterIcon.svelte';
	import SortDescendingIcon from '$lib/icons/SortDescendingIcon.svelte';
	import TableIcon from '$lib/icons/TableIcon.svelte';
	import UserGroupIcon from '$lib/icons/UserGroupIcon.svelte';
	import ViewBoardsIcon from '$lib/icons/ViewBoardsIcon.svelte';
	import { sustainableDevelopmentGoals } from '$lib/models';
	import { keycloak, navigationToggle, user } from '$lib/stores.js';

	let isExpanded = true;
	function toggleSidebar() {
		isExpanded = !isExpanded;
		if (!isExpanded) {
			filtersExpanded = false;
			sortExpanded = false;
		}
	}

	const hash = $page.url.hash;
	let selectedCategory = $page.url.searchParams.getAll('category');
	let selectedSort = $page.url.searchParams.get('sort') ?? 'modified';
	$: if (browser && $page.url.pathname == '/') {
		const query = new URLSearchParams(selectedCategory.map((f) => ['category', f]));
		if (selectedSort != 'modified') {
			query.append('sort', selectedSort);
		}
		goto(`?${query.toString()}${hash}`);
	}

	let filtersExpanded = selectedCategory.length > 0;
	function toggleFilters() {
		filtersExpanded = !filtersExpanded;
		if (filtersExpanded) {
			isExpanded = true;
		}
	}

	let sortExpanded = selectedSort != 'modified';

	function toggleSort() {
		sortExpanded = !sortExpanded;
		if (sortExpanded) {
			isExpanded = true;
		}
	}
</script>

<aside id="aside-0" class:is-expanded={isExpanded} class:is-visible={$navigationToggle}>
	<ul class="group group-controls">
		<li class:is-hidden={!isExpanded}>
			<button title={$_('boards')}>
				<ViewBoardsIcon class="icon-24" />
			</button>
		</li>
		<li class:is-hidden={!isExpanded}>
			<button title={$_('map')}>
				<MapIcon class="icon-24" />
			</button>
		</li>
		<li class:is-hidden={!isExpanded}>
			<button title={$_('table')}>
				<TableIcon class="icon-24" />
			</button>
		</li>
		<li>
			{#if isExpanded}
				<button class="primary" on:click={toggleSidebar} title={$_('collapse_sidebar')}>
					<ChevronLeftIcon class="icon-24" />
				</button>
			{:else}
				<button class="primary" on:click={toggleSidebar} title={$_('expand_sidebar')}>
					<ChevronRightIcon class="icon-24" />
				</button>
			{/if}
		</li>
	</ul>

	{#if $page.url.pathname === '/'}
		<ul class="group group-actions">
			<li>
				<button on:click={toggleFilters} aria-controls="filters" aria-expanded={filtersExpanded}>
					<FilterIcon class="icon-20" />
					<span class:is-hidden={!isExpanded}>{$_('filter')}</span>
					<span class:is-hidden={!isExpanded}>
						<Icon src={filtersExpanded ? ChevronUp : ChevronDown} size="20" />
					</span>
				</button>
				<ul id="filters" class="collapsible" class:is-hidden={!filtersExpanded}>
					{#each sustainableDevelopmentGoals.options as option}
						<li>
							<label>
								<input
									type="checkbox"
									name="filters"
									value={option}
									bind:group={selectedCategory}
								/>{$_(option)}
							</label>
						</li>
					{/each}
				</ul>
			</li>
			<li>
				<button on:click={toggleSort} aria-controls="sort" aria-expanded={sortExpanded}>
					<SortDescendingIcon class="icon-20" />
					<span class:is-hidden={!isExpanded}>{$_('sort')}</span>
					<span class:is-hidden={!isExpanded}
						><Icon src={sortExpanded ? ChevronUp : ChevronDown} size="20" /></span
					>
				</button>
				<ul id="sort" class="collapsible" class:is-hidden={!sortExpanded}>
					<li>
						<label>
							<input type="radio" value={'modified'} bind:group={selectedSort} />
							{$_('sort_modified')}
						</label>
					</li>
					<li>
						<label>
							<input type="radio" value={'alpha'} bind:group={selectedSort} />
							{$_('sort_alphabetically')}
						</label>
					</li>
				</ul>
			</li>
		</ul>
	{/if}

	<ul class="group group-links">
		<li>
			<a href="/help" class="button quiet">
				<QuestionMarkCircleIcon class="icon-20" />
				<span class:is-hidden={!isExpanded}>{$_('help')}</span>
			</a>
		</li>
		<li>
			<a href="/about" class="button quiet">
				<UserGroupIcon class="icon-20" />
				<span class:is-hidden={!isExpanded}>{$_('about')}</span>
			</a>
		</li>
	</ul>

	<ul class="group group-user-menu">
		{#if $user.isAuthenticated}
			<li>
				<a href={$keycloak.accountUrl}>
					<span class="avatar avatar-m">{$user.givenName.at(0)} {$user.familyName.at(0)}</span>
					<span class:is-hidden={!isExpanded}>{$user.givenName} {$user.familyName}</span>
				</a>
			</li>
			<li>
				<a href={$keycloak.logoutUrl} class="button">
					<LogoutIcon class={isExpanded ? 'is-hidden' : 'icon-20'} />
					<span class:is-hidden={!isExpanded}>{$_('logout')}</span>
				</a>
			</li>
		{:else}
			<li>
				<a href={$keycloak.loginUrl} class="button quiet">
					<LoginIcon class={isExpanded ? 'is-hidden' : 'icon-20'} />
					<span class:is-hidden={!isExpanded}>{$_('login')}</span>
				</a>
			</li>
			<li>
				<a href={$keycloak.registerUrl} class="button primary">
					<RegisterIcon class={isExpanded ? 'is-hidden' : 'icon-20'} />
					<span class:is-hidden={!isExpanded}>{$_('register')}</span>
				</a>
			</li>
		{/if}
	</ul>
</aside>

<style>
	aside {
		border-right: solid 1px var(--color-gray-200);
		display: none;
		flex-direction: column;
		flex-shrink: 0;
		gap: 1rem;
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
		--bg-color: var(--color-gray-400);
	}

	button[aria-controls] > span:last-child {
		margin-left: auto;
	}

	.group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.group > li > a,
	.group > li > button {
		--padding-x: 14px;
		--padding-y: 14px;
		align-items: center;
		display: flex;
		text-align: left;
	}

	.group.group-controls {
		flex-direction: row;
	}

	.group.group-controls li:last-child {
		margin-left: auto;
	}

	.group.group-controls button {
		--padding-x: 12px;
		--padding-y: 12px;
	}

	.group.group-links {
		border-bottom: solid 1px var(--color-gray-200);
		color: var(--color-gray-500);
		padding-bottom: 1rem;
	}

	.group.group-user-menu {
		margin: auto 0 1rem;
	}

	.group.group-user-menu a {
		--padding-x: 0;
		justify-content: center;
	}

	aside.is-expanded .group-actions button,
	aside.is-expanded .group-links .button,
	aside.is-expanded .group-user-menu a {
		--padding-x: 20px;
		--padding-y: 12px;
		gap: 0.5rem;
		width: 100%;
	}

	.collapsible {
		border-radius: 8px;
		box-shadow: var(--shadow-md);
		padding: 12px 17px 12px 12px;
		margin-top: 8px;
		max-height: 10rem;
		overflow-y: scroll;
	}

	.collapsible > li {
		margin-bottom: 12px;
	}

	.collapsible > li:last-child {
		margin-bottom: 0;
	}
</style>
