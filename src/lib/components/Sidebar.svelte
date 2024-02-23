<script lang="ts">
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

	type ExpandableItem = 'filters' | 'search' | 'sort' | null;

	let expandedItem: ExpandableItem = null;

	function toggleExpandedItem(item: ExpandableItem) {
		expandedItem = expandedItem == item ? null : item;
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
				on:click={() => toggleExpandedItem('search')}
				title={$_('search')}
				aria-controls="search"
				aria-expanded={expandedItem === 'search'}
			>
				<Icon src={MagnifyingGlass} size="20" mini />
			</button>
			<div class="expandable" id="search">
				<slot name="search" />
			</div>
		</li>
	{/if}

	{#if $$slots.filters}
		<li>
			<button
				class="button-nav button-square"
				class:is-active={expandedItem === 'filters'}
				on:click={() => toggleExpandedItem('filters')}
				title={$_('filter')}
				aria-controls="filters"
				aria-expanded={expandedItem === 'filters'}
			>
				<Icon src={Funnel} size="20" mini />
			</button>
			<div class="expandable" id="filters">
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
				on:click={() => toggleExpandedItem('sort')}
				title={$_('sort')}
				aria-controls="sort"
				aria-expanded={expandedItem === 'sort'}
			>
				<Icon src={BarsArrowDown} size="20" mini />
			</button>
			<div class="expandable" id="sort">
				<span class="button button-nav is-active">{$_('sort')}</span>
				<ul>
					<slot name="sort" />
				</ul>
			</div>
		</li>
	{/if}

	{#if $$slots.tabs}
		<slot name="tabs" />
	{/if}

	{#if helpSlug}
		<li>
			<a class="button button-nav button-square" href={helpURL($page.url)} title={$_('help')}>
				<Icon src={QuestionMarkCircle} size="20" mini />
			</a>
		</li>
	{/if}
</ul>

<style>
	.sidebar-items {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		position: relative;
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
