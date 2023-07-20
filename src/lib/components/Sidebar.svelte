<script lang="ts">
	import { _ } from 'svelte-i18n';
	import {
	BuildingStorefront,
		ChevronDown,
		ChevronUp,
		Icon,
		InformationCircle,
		MagnifyingGlass,
		Share
	} from 'svelte-hero-icons';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Filters from '$lib/components/Filters.svelte';
	import ChevronLeftIcon from '$lib/icons/ChevronLeftIcon.svelte';
	import ChevronRightIcon from '$lib/icons/ChevronRightIcon.svelte';
	import FilterIcon from '$lib/icons/FilterIcon.svelte';
	import LoginIcon from '$lib/icons/LoginIcon.svelte';
	import LogoutIcon from '$lib/icons/LogoutIcon.svelte';
	import MapIcon from '$lib/icons/MapIcon.svelte';
	import RegisterIcon from '$lib/icons/RegisterIcon.svelte';
	import SortDescendingIcon from '$lib/icons/SortDescendingIcon.svelte';
	import ViewBoardsIcon from '$lib/icons/ViewBoardsIcon.svelte';
	import {
		isStrategyContainer,
		payloadTypes,
		strategyTypes,
		sustainableDevelopmentGoals,
		topics
	} from '$lib/models';
	import {
		filtersToggle,
		keycloak,
		navigationToggle,
		sidebarToggle,
		sortToggle,
		user
	} from '$lib/stores.js';

	let timer: ReturnType<typeof setTimeout>;
	let terms = $page.url.searchParams.get('terms') ?? '';
	let selectedCategory = $page.url.searchParams.getAll('category');
	let selectedPayloadType = $page.url.searchParams.getAll('payloadType');
	let selectedStrategyType = $page.url.searchParams.getAll('strategyType');
	let selectedTopic = $page.url.searchParams.getAll('topic');
	let selectedSort = $page.url.searchParams.get('sort') ?? 'modified';
	$filtersToggle =
		selectedCategory.length > 0 ||
		selectedStrategyType.length > 0 ||
		selectedTopic.length > 0 ||
		selectedPayloadType.length > 0;
	$sortToggle = selectedSort != 'modified';

	const hash = $page.url.hash;

	$: if (browser && 'overlayData' in $page.data) {
		const query = new URLSearchParams($page.url.searchParams);
		query.delete('category');
		query.delete('strategyType');
		query.delete('topic');
		query.delete('sort');
		selectedCategory.forEach((c) => query.append('category', c));
		selectedStrategyType.forEach((c) => query.append('strategyType', c));
		selectedTopic.forEach((c) => query.append('topic', c));
		if (selectedSort != 'modified') {
			query.append('sort', selectedSort);
		}
		goto(`?${query.toString()}${hash}`, { keepFocus: true });
	}

	$: if (browser && 'container' in $page.data && isStrategyContainer($page.data.container)) {
		const query = new URLSearchParams($page.url.searchParams);
		query.delete('payloadType');
		selectedPayloadType.forEach((t) => query.append('payloadType', t));
		goto(`?${query.toString()}${hash}`, { keepFocus: true, replaceState: true });
	}

	$: terms, browser && debouncedSearch();

	function debouncedSearch() {
		clearTimeout(timer);
		timer = setTimeout(search, 500);
	}

	function search() {
		const searchParams = new URLSearchParams($page.url.searchParams);
		searchParams.delete('terms');
		if (terms) {
			searchParams.set('terms', terms);
		}
		goto(`?${searchParams.toString()}`, { keepFocus: true, replaceState: true });
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
	<ul class="group group-controls">
		<li class:is-hidden={!$sidebarToggle}>
			<button title={$_('boards')}>
				<ViewBoardsIcon class="icon-24" />
			</button>
		</li>
		<li class:is-hidden={!$sidebarToggle}>
			<button title={$_('map')}>
				<MapIcon class="icon-24" />
			</button>
		</li>
		<li>
			{#if $sidebarToggle}
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

	{#if 'container' in $page.data}
		<ul class="group group-tabs">
			<li>
				<a
					class="button"
					class:is-active={$page.url.pathname ===
						`/${$page.data.container.payload.type}/${$page.data.container.guid}`}
					href={`/${$page.data.container.payload.type}/${$page.data.container.guid}`}
				>
					<Icon src={InformationCircle} size="20" solid />
					<span class:is-hidden={!$sidebarToggle}>{$_('information')}</span>
				</a>
			</li>
			<li>
				<a
					class="button"
					class:is-active={$page.url.pathname ===
						`/${$page.data.container.payload.type}/${$page.data.container.guid}/relations`}
					href={`/${$page.data.container.payload.type}/${$page.data.container.guid}/relations`}
				>
					<Icon src={Share} size="20" solid />
					<span class:is-hidden={!$sidebarToggle}>{$_('relations')}</span>
				</a>
			</li>
			{#if $page.data.container.payload.type === 'measure'}
				<li>
					<a
						class="button"
						class:is-active={$page.url.pathname ==
							`/${$page.data.container.payload.type}/${$page.data.container.guid}/internal-objectives`}
						href={`/${$page.data.container.payload.type}/${$page.data.container.guid}/internal-objectives`}
					>
						<Icon src={BuildingStorefront} size="20" solid />
						<span class:is-hidden={!$sidebarToggle}>{$_('internal_objectives.label')}</span>
					</a>
				</li>
			{/if}
		</ul>
	{/if}

	{#if 'overlayData' in $page.data}
		<ul class="group group-actions">
			<li>
				<form class="search" data-sveltekit-keepfocus>
					<button
						type={$sidebarToggle ? 'submit' : 'button'}
						on:click={!$sidebarToggle ? toggleSidebar : undefined}
					>
						<Icon src={MagnifyingGlass} size="20" mini />
					</button>
					<input
						type="search"
						name="terms"
						bind:value={terms}
						style:display={$sidebarToggle ? 'block' : 'none'}
					/>
				</form>
			</li>
			<li>
				<button on:click={toggleFilters} aria-controls="filters" aria-expanded={$filtersToggle}>
					<FilterIcon class="icon-20" />
					<span class:is-hidden={!$sidebarToggle}>{$_('filter')}</span>
					<span class:is-hidden={!$sidebarToggle}>
						<Icon src={$filtersToggle ? ChevronUp : ChevronDown} size="20" />
					</span>
				</button>
				<ul id="filters" class="collapsible masked-overflow" class:is-hidden={!$filtersToggle}>
					<li>
						<Filters
							label={$_('strategy_type.label')}
							options={strategyTypes.options.map((o) => [$_(o), o])}
							bind:selectedOptions={selectedStrategyType}
						/>
					</li>
					<li>
						<Filters
							label={$_('topic.label')}
							options={topics.options.map((o) => [$_(o), o])}
							bind:selectedOptions={selectedTopic}
						/>
					</li>
					<li>
						<Filters
							label={$_('category')}
							options={sustainableDevelopmentGoals.options.map((o) => [$_(o), o])}
							bind:selectedOptions={selectedCategory}
						/>
					</li>
				</ul>
			</li>
			<li>
				<button on:click={toggleSort} aria-controls="sort" aria-expanded={$sortToggle}>
					<SortDescendingIcon class="icon-20" />
					<span class:is-hidden={!$sidebarToggle}>{$_('sort')}</span>
					<span class:is-hidden={!$sidebarToggle}
						><Icon src={$sortToggle ? ChevronUp : ChevronDown} size="20" /></span
					>
				</button>
				<ul id="sort" class="collapsible" class:is-hidden={!$sortToggle}>
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
	{:else if 'container' in $page.data && isStrategyContainer($page.data.container)}
		<ul class="group group-actions">
			<li>
				<button
					on:click={toggleFilters}
					aria-controls="strategy-filters"
					aria-expanded={$filtersToggle}
				>
					<FilterIcon class="icon-20" />
					<span class:is-hidden={!$sidebarToggle}>{$_('filter')}</span>
					<span class:is-hidden={!$sidebarToggle}>
						<Icon src={$filtersToggle ? ChevronUp : ChevronDown} size="20" />
					</span>
				</button>
				<ul
					id="strategy-filters"
					class="collapsible masked-overflow"
					class:is-hidden={!$filtersToggle}
				>
					<li>
						<Filters
							options={payloadTypes.options
								.filter((o) => o !== payloadTypes.enum.strategy)
								.map((o) => [$_(o), o])}
							bind:selectedOptions={selectedPayloadType}
						/>
					</li>
				</ul>
			</li>
		</ul>
	{/if}

	<ul class="group group-user-menu">
		{#if $user.isAuthenticated}
			<li>
				<a href={$keycloak.accountUrl}>
					<span class="avatar avatar-m">{$user.givenName.at(0)} {$user.familyName.at(0)}</span>
					<span class:is-hidden={!$sidebarToggle}>{$user.givenName} {$user.familyName}</span>
				</a>
			</li>
			<li>
				<a href={$keycloak.logoutUrl} class="button">
					<LogoutIcon class={$sidebarToggle ? 'is-hidden' : 'icon-20'} />
					<span class:is-hidden={!$sidebarToggle}>{$_('logout')}</span>
				</a>
			</li>
		{:else}
			<li>
				<a href={$keycloak.loginUrl} class="button quiet">
					<LoginIcon class={$sidebarToggle ? 'is-hidden' : 'icon-20'} />
					<span class:is-hidden={!$sidebarToggle}>{$_('login')}</span>
				</a>
			</li>
			<li>
				<a href={$keycloak.registerUrl} class="button primary">
					<RegisterIcon class={$sidebarToggle ? 'is-hidden' : 'icon-20'} />
					<span class:is-hidden={!$sidebarToggle}>{$_('register')}</span>
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
		min-height: 0;
		padding: 1rem 0.75rem 0;
	}

	aside > ul > li {
		min-height: 0;
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

	.group > li a,
	.group > li button {
		--padding-x: 14px;
		--padding-y: 14px;
		align-items: center;
		display: flex;
		text-align: left;
	}

	.group.group-controls {
		flex-direction: row;
		flex-shrink: 0;
	}

	.group.group-controls li:last-child {
		margin-left: auto;
	}

	.group.group-controls button {
		--padding-x: 12px;
		--padding-y: 12px;
	}

	.group.group-actions > :first-child,
	.group.group-actions > :last-child {
		flex-shrink: 0;
	}

	.group.group-tabs {
		flex-shrink: 0;
	}

	.group.group-user-menu {
		flex-shrink: 0;
		margin-top: auto;
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

	aside.is-expanded .group-actions button,
	aside.is-expanded .group-tabs .button,
	aside.is-expanded .group-user-menu a {
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

	.collapsible > li {
		margin-bottom: 12px;
	}

	.collapsible > li:last-child {
		margin-bottom: 0;
	}

	.search {
		display: flex;
	}

	.search > button {
		--bg-color: var(--color-gray-050);
		color: var(--color-gray-500);
		flex: 0 0 51px;
	}

	.search > input {
		background-color: var(--color-gray-050);
		border-bottom-left-radius: 0;
		border-left: none;
		border-top-left-radius: 0;
		margin: 0 0 0 -8px;
		padding: 13px 14px 13px 0;
		width: 100%;
	}

	.search > button:hover {
		--bg-color: var(--color-gray-400);
	}
</style>
