<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { cubicInOut } from 'svelte/easing';
	import { slide } from 'svelte/transition';
	import { createPopover } from 'svelte-headlessui';
	import { createPopperActions } from 'svelte-popperjs';
	import { Tree, type TreeItem } from 'melt/builders';
	import { _ } from 'svelte-i18n';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import ChevronDown from '~icons/flowbite/chevron-down-outline';
	import ChevronRight from '~icons/flowbite/chevron-right-outline';
	import ChevronSort from '~icons/flowbite/chevron-sort-outline';
	import Close from '~icons/flowbite/close-outline';
	import Plus from '~icons/knotdots/plus';
	import Relation from '~icons/knotdots/relation';
	import SearchInput from '$lib/components/SearchInput.svelte';
	import { createFeatureDecisions } from '$lib/features';
	import {
		type Container,
		containerOfType,
		getOrganizationURL,
		isOrganizationalUnitContainer,
		isOrganizationContainer,
		type NewContainer,
		type OrganizationalUnitPayload,
		type OrganizationPayload,
		pathnameWithoutContextSegment,
		payloadTypes,
		predicates
	} from '$lib/models';
	import { hasPart, isPartOf } from '$lib/relations';
	import { ability, mayCreateContainer, newContainer, user } from '$lib/stores';
	import { getVisibleWorkspaces } from '$lib/workspaces';

	interface OrgUnitTreeItem extends TreeItem {
		name: string;
		url: string;
		children?: OrgUnitTreeItem[];
	}

	interface Props {
		defaultOrganization?: Container<OrganizationPayload>;
		organizationalUnits: Container<OrganizationalUnitPayload>[];
		currentOrganizationalUnit?: Container<OrganizationalUnitPayload>;
	}

	let { defaultOrganization, organizationalUnits, currentOrganizationalUnit }: Props = $props();

	const title = $_('organizational_units');

	const popover = createPopover({ label: title });

	const createContainerDialog = getContext<{ getElement: () => HTMLDialogElement }>(
		'createContainerDialog'
	);

	function handleCreateOrgUnit(level: number, parentGuid?: string) {
		const container = containerOfType(
			payloadTypes.enum.organizational_unit,
			page.data.currentOrganization.guid,
			null,
			page.data.currentOrganization.guid,
			env.PUBLIC_KC_REALM as string
		) as NewContainer<OrganizationalUnitPayload>;

		container.payload.level = level;

		if (parentGuid) {
			container.relation = [
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

	const [popperRef, popperContent] = createPopperActions({
		placement: 'bottom-start',
		strategy: 'absolute'
	});

	const extraOpts = {
		modifiers: [
			{ name: 'offset', options: { offset: [0, 4] } },
			{
				name: 'preventOverflow',
				options: { altAxis: true, boundary: 'clippingParents', padding: 8 }
			}
		]
	};

	let searchQuery = $state('');

	function linkPathForContainer(
		container: Container<OrganizationPayload | OrganizationalUnitPayload>
	) {
		const pathname = pathnameWithoutContextSegment(
			page.url.pathname,
			page.data.currentOrganizationalUnit ?? page.data.currentOrganization
		);
		const organization = isOrganizationContainer(container)
			? container
			: page.data.organizations.find(({ guid }) => guid === container.organization);
		const workspacePaths = organization
			? getVisibleWorkspaces({
					organization,
					organizationalUnit: isOrganizationalUnitContainer(container) ? container : null,
					features: createFeatureDecisions(page.data.features),
					ability: $ability,
					user: $user
				}).flatMap((w) => Object.values(w.views))
			: [];

		return workspacePaths.some((w) => w.endsWith(pathname)) ? pathname : '/all/page';
	}

	function optionURL(
		container: Container<OrganizationPayload> | Container<OrganizationalUnitPayload>
	) {
		return getOrganizationURL(container, linkPathForContainer(container), env, {
			organizationSlug: page.data.currentOrganization.payload.slug
		}).toString();
	}

	function buildTree(units: Container<OrganizationalUnitPayload>[]): OrgUnitTreeItem[] {
		const roots = units.filter((u) => !isPartOf(u, units));

		function buildNode(unit: Container<OrganizationalUnitPayload>): OrgUnitTreeItem {
			const childUnits = hasPart(unit, units) as Container<OrganizationalUnitPayload>[];
			return {
				id: unit.guid,
				name: unit.payload.name,
				url: optionURL(unit),
				children: childUnits.length > 0 ? childUnits.map(buildNode) : undefined
			};
		}

		return roots.map(buildNode);
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

	onMount(() => {
		tree.expandAll();
	});
</script>

{#snippet renderChildren(children: typeof tree.children, depth: number)}
	{#each children as child (child.id)}
		<li {...child.attrs} class={['tree-item', ...(child.selected ? ['tree-item--selected'] : [])]}>
			<div class="tree-item-content" style="padding-left: {depth * 1.25 + 0.25}rem">
				{#if child.canExpand}
					<button
						class="action-button"
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
				<a
					class="truncated"
					data-sveltekit-preload-code="tap"
					data-sveltekit-preload-data="tap"
					href={child.item.url}
				>
					{child.item.name}
				</a>
				{#if canCreateOrgUnit && depth < 3}
					<button
						aria-label={$_('organizational_unit.create')}
						class="action-button action-button--size-s"
						onclick={(e) => {
							e.stopPropagation();
							handleCreateOrgUnit(depth + 2, child.id);
						}}
						tabindex={-1}
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

<div class="dropdown" use:popperRef>
	<button class="dropdown-button" type="button" use:popover.button>
		<span class="truncated">
			{currentOrganizationalUnit?.payload.name ?? $_('organizational_units')}
		</span>
		<ChevronSort />
	</button>

	{#if $popover.expanded}
		<div
			class="dropdown-panel"
			transition:slide={{ duration: 125, easing: cubicInOut }}
			use:popover.panel
			use:popperContent={extraOpts}
		>
			<div class="dropdown-panel-title">
				<span>{title}</span>
				{#if canCreateOrgUnit}
					<button class="action-button" onclick={() => handleCreateOrgUnit(1)} type="button">
						<Plus />
						<span class="is-visually-hidden">{$_('organizational_unit.create')}</span>
					</button>
				{/if}
				<button class="action-button" onclick={() => popover.close()} type="button">
					<Close />
					<span class="is-visually-hidden">{$_('close')}</span>
				</button>
			</div>
			<div class="search">
				<SearchInput bind:value={searchQuery} />
			</div>
			<ul class="tree-root" {...tree.root}>
				{@render renderChildren(tree.children, 0)}
			</ul>
			{#if defaultOrganization}
				<a
					class="dropdown-button dropdown-button--footer"
					data-sveltekit-preload-code="tap"
					data-sveltekit-preload-data="tap"
					href={optionURL(defaultOrganization)}
				>
					<Relation />
					<span>{defaultOrganization.payload.name}</span>
					<ChevronRight />
				</a>
			{/if}
		</div>
	{/if}
</div>

<style>
	.dropdown {
		display: flex;
		position: static;
		width: 100%;
	}

	.dropdown-panel {
		background-color: var(--color-gray-025);
	}

	.dropdown-panel-title {
		align-items: center;
		color: var(--color-gray-700);
		display: flex;
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.25rem 0.25rem 0 0.75rem;
	}

	.dropdown-panel-title > span {
		margin-right: auto;
	}

	.dropdown-button--footer {
		--dropdown-button-border-radius: 0;
		--dropdown-button-box-shadow: none;
		--dropdown-button-default-background: var(--color-gray-050);
		--dropdown-button-padding: 0.5rem 0.75rem;

		border-top: 1px solid var(--color-gray-200);
		flex-shrink: 0;
		gap: 0.5rem;
		height: 2.375rem;
	}

	.dropdown-button--footer > span {
		margin-right: auto;
	}

	.search {
		--search-icon-size: 1rem;

		color: var(--color-gray-500);
		padding: 0 0.25rem;
	}

	ul {
		margin: 0;
		padding: 0;
	}

	.tree-root {
		overflow-y: auto;
		padding: 0.25rem;
		width: 22.5rem;
	}

	.tree-item-content {
		align-items: center;
		border-radius: 8px;
		color: var(--color-gray-700);
		display: flex;
		font-weight: 500;
		gap: 0.125rem;
		padding: 0.25rem;
	}

	.tree-item-content:hover {
		background-color: rgb(from var(--color-gray-500) r g b / 0.1);
	}

	.tree-item.tree-item--selected > .tree-item-content {
		background-color: rgb(from var(--color-primary-500) r g b / 0.15);
		color: var(--color-primary-700);
	}

	.tree-item-content > a {
		flex: 1 1 0;
	}

	.tree-expand-spacer {
		flex-shrink: 0;
		width: 2rem;
	}
</style>
