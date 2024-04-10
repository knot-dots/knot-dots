<script lang="ts">
	import { tick } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Environments from '~icons/knotdots/environments';
	import Filter from '~icons/knotdots/filter';
	import Help from '~icons/knotdots/help';
	import Search from '~icons/knotdots/search';
	import Sort from '~icons/knotdots/sort';
	import { page } from '$app/stores';
	import { overlayKey, paramsFromFragment } from '$lib/models';

	export let helpSlug = '';

	type Item = 'environments' | 'filters' | 'search' | 'sort' | null;

	let expandedItem: Item = null;
	let lockedItem: Item = null;
	let timer: ReturnType<typeof setTimeout>;
	let search: HTMLDivElement;

	async function expandItem(item: Item) {
		if (lockedItem == null || lockedItem == item) {
			clearTimeout(timer);
			expandedItem = item;
			await tick();
			if (item == 'search') {
				search.querySelector('input')?.focus();
			}
		}
	}

	function lockItem(item: Item) {
		lockedItem = item == lockedItem ? null : item;
		if (lockedItem == item) {
			expandItem(item);
		} else {
			collapseItem(item);
		}
	}

	function collapseItem(item: Item) {
		if (expandedItem == item && lockedItem != item) {
			expandedItem = null;
		}
	}

	function collapseItemDelayed(item: Item) {
		timer = setTimeout(() => collapseItem(item), 500);
	}

	function helpURL(url: URL) {
		const newParams = paramsFromFragment(url);
		if (newParams.get(overlayKey.enum['view-help']) === helpSlug) {
			newParams.delete(overlayKey.enum['view-help']);
		} else {
			newParams.set(overlayKey.enum['view-help'], helpSlug);
		}
		return `#${newParams.toString()}`;
	}
</script>

<ul class="sidebar-items">
	{#if $$slots.search}
		<li>
			<button
				class="button-nav button-square"
				class:is-active={expandedItem === 'search'}
				on:click={() => lockItem('search')}
				on:mouseenter={() => expandItem('search')}
				on:mouseleave={() => collapseItemDelayed('search')}
				title={$_('search')}
				aria-controls="search"
				aria-expanded={expandedItem === 'search'}
			>
				<Search />
			</button>
			<!--svelte-ignore a11y-no-static-element-interactions -->
			<div
				class="expandable"
				id="search"
				bind:this={search}
				on:mouseenter={() => clearTimeout(timer)}
				on:mouseleave={() => collapseItemDelayed('search')}
			>
				<slot name="search" />
			</div>
		</li>
	{/if}

	{#if $$slots.environments}
		<li>
			<button
				class="button-nav button-square"
				class:is-active={expandedItem === 'environments'}
				on:click={() => lockItem('environments')}
				on:mouseenter={() => expandItem('environments')}
				on:mouseleave={() => collapseItemDelayed('environments')}
				title={$_('environments')}
				aria-controls="environments"
				aria-expanded={expandedItem === 'environments'}
			>
				<Environments />
			</button>
			<!--svelte-ignore a11y-no-static-element-interactions -->
			<div
				class="expandable"
				id="environments"
				on:mouseenter={() => clearTimeout(timer)}
				on:mouseleave={() => collapseItemDelayed('environments')}
			>
				<ul class="environments">
					<slot name="environments" />
				</ul>
			</div>
		</li>
	{/if}

	{#if $$slots.filters}
		<li>
			<button
				class="button-nav button-square"
				class:is-active={expandedItem === 'filters'}
				on:click={() => lockItem('filters')}
				on:mouseenter={() => expandItem('filters')}
				on:mouseleave={() => collapseItemDelayed('filters')}
				title={$_('filter')}
				aria-controls="filters"
				aria-expanded={expandedItem === 'filters'}
			>
				<Filter />
			</button>
			<!--svelte-ignore a11y-no-static-element-interactions -->
			<div
				class="expandable"
				id="filters"
				on:mouseenter={() => clearTimeout(timer)}
				on:mouseleave={() => collapseItemDelayed('filters')}
			>
				<span class="button button-nav is-active">{$_('filter')}</span>
				<ul>
					<slot name="filters" />
				</ul>
			</div>
		</li>
	{/if}

	{#if $$slots.sort}
		<li>
			<button
				class="button-nav button-square"
				class:is-active={expandedItem === 'sort'}
				on:click={() => lockItem('sort')}
				on:mouseenter={() => expandItem('sort')}
				on:mouseleave={() => collapseItemDelayed('sort')}
				title={$_('sort')}
				aria-controls="sort"
				aria-expanded={expandedItem === 'sort'}
			>
				<Sort />
			</button>
			<!--svelte-ignore a11y-no-static-element-interactions -->
			<div
				class="expandable"
				id="sort"
				on:mouseenter={() => clearTimeout(timer)}
				on:mouseleave={() => collapseItemDelayed('sort')}
			>
				<span class="button button-nav is-active">{$_('sort')}</span>
				<ul>
					<slot name="sort" />
				</ul>
			</div>
		</li>
	{/if}

	<slot name="tabs" />

	{#if helpSlug}
		<li>
			<a class="button button-nav button-square" href={helpURL($page.url)} title={$_('help')}>
				<Help />
			</a>
		</li>
	{/if}

	{#if $$slots.extra}
		<li class="separator"></li>
		<slot name="extra" />
	{/if}
</ul>

<style>
	.sidebar-items {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		height: 100%;
		position: relative;
	}

	.separator {
		margin-top: auto;
	}

	.expandable {
		display: none;
		left: 3.5rem;
		position: absolute;
		top: 0;
		width: 14.25rem;
		z-index: 1;
	}

	.expandable > span {
		margin-bottom: 0.5rem;
	}

	.expandable > ul {
		background: white;
		border: solid 1px var(--color-gray-900);
		border-radius: 8px;
		box-shadow: var(--shadow-md);
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		max-height: calc(100vh - var(--nav-height) * 2 - 1.5rem);
		padding: 0.25rem;
	}

	.expandable > ul.environments {
		background: transparent;
		border: none;
		box-shadow: none;
		padding: 0;
		gap: 0.5rem;
	}

	.environments :global(a) {
		--button-background: white;

		height: 2.5rem;
		width: 100%;
	}

	[aria-expanded='true'] + .expandable {
		display: block;
	}
</style>
