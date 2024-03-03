<script lang="ts">
	import { tick } from 'svelte';
	import {
		BarsArrowDown,
		Funnel,
		Icon,
		MagnifyingGlass,
		QuestionMarkCircle
	} from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import paramsFromURL from '$lib/client/paramsFromURL';
	import { overlayKey } from '$lib/models';

	export let helpSlug = '';

	type Item = 'filters' | 'search' | 'sort' | null;

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
		const newParams = new URLSearchParams(paramsFromURL(url));
		newParams.set(overlayKey.enum['view-help'], helpSlug);
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
				<Icon src={MagnifyingGlass} size="20" mini />
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
				<Icon src={Funnel} size="20" mini />
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
				<Icon src={BarsArrowDown} size="20" mini />
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
				<Icon src={QuestionMarkCircle} size="20" mini />
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

	[aria-expanded='true'] + .expandable {
		display: block;
	}
</style>
