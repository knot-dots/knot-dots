<script lang="ts">
	import { tick } from 'svelte';
	import { _ } from 'svelte-i18n';
	import DocumentText from '~icons/heroicons/document-text-20-solid';
	import Eye from '~icons/heroicons/eye-solid';
	import Filter from '~icons/knotdots/filter';
	import Help from '~icons/knotdots/help';
	import Info from '~icons/knotdots/info';
	import Search from '~icons/knotdots/search';
	import Sort from '~icons/knotdots/sort';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { createFeatureDecisions } from '$lib/features';
	import { overlayKey, paramsFromFragment } from '$lib/models';
	import SidebarTab from '$lib/components/SidebarTab.svelte';
	import { overlayHistory } from '$lib/stores';

	export let helpSlug = '';

	type Item = 'workspaces' | 'filters' | 'search' | 'sort' | null;

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

	async function toggleHelp(url: URL) {
		let newParams = paramsFromFragment(url);
		if (newParams.get(overlayKey.enum['view-help']) === helpSlug) {
			if ($overlayHistory.length > 1) {
				$overlayHistory = $overlayHistory.slice(0, $overlayHistory.length - 1);
				newParams = $overlayHistory[$overlayHistory.length - 1] as URLSearchParams;
			} else {
				newParams = new URLSearchParams();
			}
		} else {
			newParams.set(overlayKey.enum['view-help'], helpSlug);
		}
		return await goto(`#${newParams.toString()}`);
	}
</script>

<ul class="sidebar-items" data-sveltekit-preload-data="hover">
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
				<span class="button button-nav is-active">{$_('search')}</span>
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

	{#if $$slots.viewMode && createFeatureDecisions($page.data.features).useViewModes()}}
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
				<Eye />
			</button>
			<!--svelte-ignore a11y-no-static-element-interactions -->
			<div
				class="expandable"
				id="sort"
				on:mouseenter={() => clearTimeout(timer)}
				on:mouseleave={() => collapseItemDelayed('sort')}
			>
				<span class="button button-nav is-active">{$_('view_mode')}</span>
				<ul>
					<slot name="viewMode" />
				</ul>
			</div>
		</li>
	{/if}

	<slot name="tabs" />

	{#if helpSlug}
		<li class="sidebar-items-help">
			<button
				class="button-nav button-square"
				title={$_('help')}
				on:click={() => toggleHelp($page.url)}
			>
				<Help />
			</button>
		</li>
	{/if}

	<li class="separator"></li>
	<slot name="extra">
		<SidebarTab href="/about" iconSource={Info} text={$_('about')} />
		<SidebarTab href="/imprint" iconSource={DocumentText} text={$_('imprint')} />
	</slot>
</ul>

<style>
	.sidebar-items {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		height: 100%;
		position: relative;
	}

	.sidebar-items-help:nth-child(n + 2) {
		margin-top: 2.5rem;
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
