<script lang="ts">
	import { getContext, tick, type Snippet } from 'svelte';
	import { cubicInOut } from 'svelte/easing';
	import { slide } from 'svelte/transition';
	import { createPopover } from 'svelte-headlessui';
	import { Tree, type TreeItem } from 'melt/builders';
	import { _ } from 'svelte-i18n';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import Close from '~icons/flowbite/close-outline';
	import ChevronDown from '~icons/flowbite/chevron-down-outline';
	import ChevronRight from '~icons/flowbite/chevron-right-outline';
	import ChevronSort from '~icons/knotdots/chevron-sort';
	import Plus from '~icons/knotdots/plus';
	import Search from '~icons/knotdots/search';
	import Relation from '~icons/knotdots/relation';
	import {
		containerOfType,
		getOrganizationURL,
		type NewContainer,
		type OrganizationalUnitContainer,
		type OrganizationContainer,
		payloadTypes,
		predicates
	} from '$lib/models';
	import { hasPart, isPartOf } from '$lib/relations';
	import { mayCreateContainer, newContainer } from '$lib/stores';

	interface OrgUnitTreeItem extends TreeItem {
		name: string;
		url: string;
		children?: OrgUnitTreeItem[];
	}

	interface Props {
		defaultOrganization?: OrganizationContainer;
		organizationalUnits: OrganizationalUnitContainer[];
		currentOrganizationalUnit?: OrganizationalUnitContainer;
		title: string;
		children: Snippet;
	}

	let {
		defaultOrganization,
		organizationalUnits,
		currentOrganizationalUnit,
		title,
		children
	}: Props = $props();

	const popover = createPopover({});

	const createContainerDialog = getContext<{ getElement: () => HTMLDialogElement }>(
		'createContainerDialog'
	);

	function handleCreateOrgUnit(parentGuid?: string) {
		const container = containerOfType(
			payloadTypes.enum.organizational_unit,
			page.data.currentOrganization.guid,
			null,
			page.data.currentOrganization.guid,
			env.PUBLIC_KC_REALM as string
		) as NewContainer;

		if (parentGuid) {
			container.relation = [
				...container.relation,
				{
					object: parentGuid,
					position: 0,
					predicate: predicates.enum['is-part-of']
				}
			];
		}

		$newContainer = container;
		createContainerDialog.getElement().showModal();
	}

	$effect(() => {
		popover.set({ label: title });
	});

	$effect.pre(() => {
		if (page.url) {
			popover.close();
		}
	});

	let buttonEl: HTMLButtonElement | undefined = $state();
	let panelEl: HTMLDivElement | undefined = $state();
	let searchQuery = $state('');
	let searchInputEl: HTMLInputElement | undefined = $state();
	let popoverPosition = $state({ top: 0, left: 0, minWidth: 0 });

	function updatePosition() {
		if (buttonEl) {
			const rect = buttonEl.getBoundingClientRect();
			popoverPosition = {
				top: rect.bottom + 4,
				left: rect.left,
				minWidth: rect.width
			};
		}
	}

	$effect(() => {
		if ($popover.expanded) {
			searchQuery = '';
			updatePosition();
			tick().then(() => searchInputEl?.focus());

			const onScroll = (e: Event) => {
				if (panelEl && e.target instanceof Node && panelEl.contains(e.target)) return;
				popover.close();
			};
			window.addEventListener('scroll', onScroll, { capture: true });
			return () => window.removeEventListener('scroll', onScroll, { capture: true });
		}
	});

	function pathnameWithoutContextSegment() {
		const pathnameSegments = page.url.pathname.split('/');
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		if (pathnameSegments.length > 1 && uuidRegex.test(pathnameSegments[1])) {
			return [pathnameSegments.slice(0, 1), ...pathnameSegments.slice(2)].join('/');
		} else {
			return page.url.pathname;
		}
	}

	function optionURL(container: OrganizationContainer | OrganizationalUnitContainer) {
		return getOrganizationURL(container, pathnameWithoutContextSegment(), env).toString();
	}

	function handleButtonClick() {
		// Popover toggle handled by svelte-headlessui
	}

	function buildTree(units: OrganizationalUnitContainer[]): OrgUnitTreeItem[] {
		const roots = units.filter((u) => !isPartOf(u, units));

		function buildNode(unit: OrganizationalUnitContainer): OrgUnitTreeItem {
			const childUnits = hasPart(unit, units) as OrganizationalUnitContainer[];
			return {
				id: unit.guid,
				name: unit.payload.name,
				url: optionURL(unit),
				children: childUnits.length > 0 ? childUnits.map(buildNode) : undefined
			};
		}

		return roots.map(buildNode);
	}

	function findAncestorIds(
		unit: OrganizationalUnitContainer,
		units: OrganizationalUnitContainer[]
	): string[] {
		const ids: string[] = [];
		let current: OrganizationalUnitContainer | undefined = unit;
		while (current) {
			const parent = isPartOf(current, units) as OrganizationalUnitContainer | undefined;
			if (parent) {
				ids.push(parent.guid);
				current = parent;
			} else {
				break;
			}
		}
		return ids;
	}

	let canCreateOrgUnit = $derived(
		$mayCreateContainer(payloadTypes.enum.organizational_unit, page.data.currentOrganization.guid)
	);

	function filterTree(items: OrgUnitTreeItem[], query: string): OrgUnitTreeItem[] {
		const lowerQuery = query.toLowerCase();
		return items.reduce<OrgUnitTreeItem[]>((acc, item) => {
			const filteredChildren = item.children ? filterTree(item.children, query) : undefined;
			if (
				item.name.toLowerCase().includes(lowerQuery) ||
				(filteredChildren && filteredChildren.length > 0)
			) {
				acc.push({
					...item,
					children:
						filteredChildren && filteredChildren.length > 0 ? filteredChildren : item.children
				});
			}
			return acc;
		}, []);
	}

	const treeItems = $derived(
		searchQuery
			? filterTree(buildTree(organizationalUnits), searchQuery)
			: buildTree(organizationalUnits)
	);

	const tree = new Tree<OrgUnitTreeItem>({
		items: () => treeItems,
		selected: () => currentOrganizationalUnit?.guid,
		expandOnClick: false,
		onSelectedChange: (value: string | undefined) => {
			if (value) {
				const item = tree.getItem(value);
				if (item) {
					goto(item.url);
				}
			}
		}
	});

	$effect(() => {
		if (currentOrganizationalUnit) {
			const ancestorIds = findAncestorIds(currentOrganizationalUnit, organizationalUnits);
			for (const id of ancestorIds) {
				tree.expand(id);
			}
		}
	});
</script>

{#snippet renderChildren(children: typeof tree.children, depth: number)}
	{#each children as child (child.id)}
		<li {...child.attrs} class="tree-item" class:tree-item--selected={child.selected}>
			<div class="tree-item-content" style="padding-left: {depth * 1.25 + 0.25}rem">
				{#if child.canExpand}
					<button
						class="tree-expand-button"
						onclick={(e) => {
							e.stopPropagation();
							child.toggleExpand();
						}}
						tabindex={-1}
						type="button"
					>
						{#if child.expanded}<ChevronDown />{:else}<ChevronRight />{/if}
					</button>
				{:else}
					<span class="tree-expand-spacer"></span>
				{/if}
				<a class="tree-item-link" href={child.item.url} title={child.item.name}>
					{child.item.name}
				</a>
				{#if canCreateOrgUnit && depth < 3}
					<button
						class="tree-item-add"
						onclick={(e) => {
							e.stopPropagation();
							handleCreateOrgUnit(child.id);
						}}
						tabindex={-1}
						title={$_('organizational_unit.create')}
						type="button"
					>
						<Plus />
					</button>
				{/if}
			</div>
			{#if child.canExpand && child.expanded && child.children}
				<ul {...tree.group}>
					{@render renderChildren(child.children, depth + 1)}
				</ul>
			{/if}
		</li>
	{/each}
{/snippet}

<div class="context-select">
	<button
		class="context-select-button"
		bind:this={buttonEl}
		onclick={handleButtonClick}
		type="button"
		use:popover.button
	>
		{@render children()}
		{#if organizationalUnits.length > 0}
			<ChevronSort />
		{/if}
	</button>

	{#if $popover.expanded && organizationalUnits.length > 0}
		<div
			bind:this={panelEl}
			class="context-select-popover"
			style="top: {popoverPosition.top}px; left: {popoverPosition.left}px; min-width: {popoverPosition.minWidth}px;"
			transition:slide={{ duration: 125, easing: cubicInOut }}
			use:popover.panel
		>
			<div class="context-select-header">
				<span class="context-select-title">{title}</span>
				<button class="context-select-close" onclick={() => popover.close()} type="button">
					<Close />
					<span class="is-visually-hidden">{$_('close')}</span>
				</button>
			</div>
			<div class="context-select-search">
				<Search />
				<input
					bind:this={searchInputEl}
					bind:value={searchQuery}
					placeholder={$_('search')}
					type="search"
				/>
			</div>
			<div class="tree-container">
				<ul class="tree-root" {...tree.root}>
					{@render renderChildren(tree.children, 0)}
				</ul>
			</div>
			{#if defaultOrganization}
				<a class="context-select-footer" href={optionURL(defaultOrganization)}>
					<Relation />
					<span class="context-select-footer-label">{defaultOrganization.payload.name}</span>
					<ChevronRight />
				</a>
			{/if}
		</div>
	{/if}
</div>

<style>
	.context-select {
		display: flex;
		flex: 1 0 0;
		min-width: 0;
	}

	.context-select-button {
		align-items: center;
		background: none;
		border: none;
		border-radius: 8px;
		color: inherit;
		cursor: pointer;
		display: flex;
		flex: 1 0 0;
		gap: 0.375rem;
		height: 2.25rem;
		min-width: 0;
		padding: 0 0.5rem;
	}

	.context-select-button:hover {
		background-color: rgba(0, 0, 0, 0.04);
	}

	.context-select-button :global(svg) {
		color: inherit;
		flex-shrink: 0;
		height: 1rem;
		width: 1rem;
	}

	.context-select-popover {
		background: white;
		border: 1px solid var(--color-gray-200);
		border-radius: 8px;
		box-shadow:
			0 4px 6px -1px rgba(0, 0, 0, 0.1),
			0 10px 15px -3px rgba(0, 0, 0, 0.06);
		display: flex;
		flex-direction: column;
		overflow: hidden;
		position: fixed;
		width: 260px;
		z-index: 10;
	}

	.context-select-header {
		align-items: center;
		display: flex;
		justify-content: space-between;
		padding: 0.375rem 0.5rem;
	}

	.context-select-title {
		color: var(--color-gray-400);
		font-size: 0.75rem;
		font-weight: 600;
	}

	.context-select-close {
		align-items: center;
		background: none;
		border: none;
		border-radius: 8px;
		color: var(--color-gray-400);
		cursor: pointer;
		display: flex;
		justify-content: center;
		padding: 0.25rem;
	}

	.context-select-close:hover {
		background-color: var(--color-gray-050);
		color: var(--color-gray-600);
	}

	.context-select-close :global(svg) {
		height: 1rem;
		width: 1rem;
	}

	.context-select-search {
		align-items: center;
		background-color: var(--color-gray-050);
		border-radius: 6px;
		color: var(--color-gray-400);
		display: flex;
		gap: 0.375rem;
		margin: 0.25rem;
		padding: 0.25rem 0.5rem;
	}

	.context-select-search :global(svg) {
		flex-shrink: 0;
		height: 1rem;
		width: 1rem;
	}

	.context-select-search input {
		background: transparent;
		border: none;
		color: var(--color-gray-700);
		font-size: 0.875rem;
		height: 1.5rem;
		outline: none;
		padding: 0;
		width: 100%;
	}

	.context-select-search input::placeholder {
		color: var(--color-gray-400);
	}

	.tree-container {
		max-height: calc(4 * 2.125rem + 0.5rem);
		overflow-y: auto;
		padding: 0.25rem;
	}

	.tree-root {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.tree-root :global(ul) {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.tree-item {
		outline: none;
	}

	.tree-item-content {
		align-items: center;
		border-radius: 6px;
		display: flex;
		gap: 0.125rem;
		min-height: 2rem;
	}

	.tree-item-content:hover {
		background-color: var(--color-gray-050);
	}

	.tree-item--selected > .tree-item-content {
		background-color: var(--color-primary-050, var(--color-gray-100));
	}

	.tree-expand-button {
		align-items: center;
		background: none;
		border: none;
		border-radius: 4px;
		color: var(--color-gray-400);
		cursor: pointer;
		display: flex;
		flex-shrink: 0;
		height: 1.25rem;
		justify-content: center;
		padding: 0;
		width: 1.25rem;
	}

	.tree-expand-button:hover {
		background-color: var(--color-gray-100);
		color: var(--color-gray-600);
	}

	.tree-expand-button :global(svg) {
		height: 0.75rem;
		width: 0.75rem;
	}

	.tree-expand-spacer {
		flex-shrink: 0;
		width: 1.25rem;
	}

	.tree-item-link {
		color: var(--color-gray-600);
		flex: 1 1 0;
		font-size: 0.875rem;
		font-weight: 500;
		line-height: 1.5;
		overflow: hidden;
		padding: 0.25rem 0.5rem 0.25rem 0.125rem;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.tree-item--selected > .tree-item-content .tree-item-link {
		color: var(--color-primary-700, var(--color-gray-800));
		font-weight: 600;
	}

	.tree-item-add {
		align-items: center;
		background: none;
		border: none;
		border-radius: 4px;
		color: var(--color-gray-400);
		cursor: pointer;
		display: flex;
		flex-shrink: 0;
		height: 1.25rem;
		justify-content: center;
		opacity: 0;
		padding: 0;
		width: 1.25rem;
	}

	.tree-item-content:hover .tree-item-add {
		opacity: 1;
	}

	.tree-item-add:hover {
		background-color: var(--color-gray-100);
		color: var(--color-gray-600);
	}

	.tree-item-add :global(svg) {
		height: 0.625rem;
		width: 0.625rem;
	}

	.context-select-footer {
		align-items: center;
		background-color: var(--color-gray-050);
		border-top: 1px solid var(--color-gray-200);
		color: var(--color-gray-700);
		display: flex;
		flex-shrink: 0;
		font-size: 0.875rem;
		font-weight: 500;
		gap: 0.5rem;
		line-height: 1.25;
		padding: 0.625rem 0.75rem;
	}

	.context-select-footer :global(svg) {
		flex-shrink: 0;
		height: 1rem;
		width: 1rem;
	}

	.context-select-footer-label {
		flex: 1 1 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
