<script lang="ts">
	import { createMenu } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import ChevronDown from '~icons/flowbite/chevron-down-outline';
	import ChevronUp from '~icons/flowbite/chevron-up-outline';
	import ColumnSolid from '~icons/flowbite/column-solid';
	import Grid from '~icons/flowbite/grid-solid';
	import TableRow from '~icons/flowbite/table-row-solid';
	import Compass from '~icons/knotdots/compass';
	import LandingPage from '~icons/knotdots/landing-page';
	import Level from '~icons/knotdots/level';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { workspaceFromPathname, type WorkspaceViewKey } from '$lib/workspaces';

	const VIEW_META: Record<WorkspaceViewKey, { icon: typeof Grid; labelKey: string }> = {
		page: { icon: LandingPage, labelKey: 'workspace.view.page' },
		catalog: { icon: Grid, labelKey: 'workspace.view.catalog' },
		level: { icon: Level, labelKey: 'workspace.view.level' },
		status: { icon: ColumnSolid, labelKey: 'workspace.view.status' },
		table: { icon: TableRow, labelKey: 'workspace.view.table' },
		monitoring: { icon: Compass, labelKey: 'workspace.view.monitoring' }
	};

	let selectedContext = $derived(
		page.data.currentOrganizationalUnit ?? page.data.currentOrganization
	);

	let pathnameWithoutContextSegment = $derived.by(() => {
		const segments = page.url.pathname.split('/');
		if (segments.length > 1 && segments[1] === selectedContext.guid) {
			return [segments.slice(0, 1), ...segments.slice(2)].join('/');
		}
		return page.url.pathname;
	});

	let workspace = $derived(workspaceFromPathname(pathnameWithoutContextSegment));

	let viewOptions = $derived.by(() => {
		if (!workspace) return [];
		return (Object.entries(workspace.views) as Array<[WorkspaceViewKey | 'default', string]>)
			.filter(([key]) => key !== 'default')
			.map(([key, path]) => {
				const meta = VIEW_META[key as WorkspaceViewKey];
				return {
					key,
					path: `/${selectedContext.guid}${path}`,
					icon: meta.icon,
					label: $_(meta.labelKey)
				};
			});
	});

	let currentView = $derived(viewOptions.find((v) => v.path === page.url.pathname));

	const menu = createMenu({});

	function handleChange(event: Event) {
		const detail = (event as CustomEvent).detail;
		if (detail.selected && detail.selected !== page.url.pathname) {
			const url = new URL(page.url);
			url.pathname = detail.selected;
			url.searchParams.delete('related-to');
			menu.close();
			goto(url);
		}
	}

	const [popperRef, popperContent] = createPopperActions({
		placement: 'bottom-start',
		strategy: 'absolute'
	});
	const extraOpts = { modifiers: [{ name: 'offset', options: { offset: [0, 4] } }] };
</script>

{#if viewOptions.length > 1}
	<div class="view-select" use:popperRef>
		<button class="dropdown-button" onchange={handleChange} type="button" use:menu.button>
			{#if currentView}
				<currentView.icon />
				<span>{currentView.label}</span>
			{:else}
				<span>{$_('workspace.view.label')}</span>
			{/if}
			{#if $menu.expanded}<ChevronUp />{:else}<ChevronDown />{/if}
		</button>
		{#if $menu.expanded}
			<ul class="dropdown-panel menu" use:menu.items use:popperContent={extraOpts}>
				{#each viewOptions as option (option.key)}
					<li class="menu-item" class:menu-item--selected={option.path === currentView?.path}>
						<button type="button" use:menu.item={{ value: option.path }}>
							<option.icon />
							<span>{option.label}</span>
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
{/if}

<style>
	.view-select {
		align-items: center;
		display: inline-flex;
		gap: 0.5rem;
		position: relative;
	}

	.dropdown-button {
		align-items: center;
		background-color: var(--color-gray-050);
		border: 1px solid var(--color-gray-200);
		border-radius: 9999px;
		color: var(--color-gray-900);
		cursor: pointer;
		display: inline-flex;
		gap: 0.375rem;
		height: 2rem;
		padding: 0 0.75rem;
	}

	.dropdown-button:hover {
		background-color: var(--color-gray-050);
	}

	.dropdown-panel {
		background-color: var(--color-white);
		border: 1px solid var(--color-gray-200);
		border-radius: 0.5rem;
		box-shadow: var(--shadow-lg);
		list-style: none;
		margin: 0;
		min-width: 12rem;
		padding: 0.25rem;
		z-index: 50;
	}

	.menu-item > button {
		align-items: center;
		background: transparent;
		border: 0;
		border-radius: 0.375rem;
		cursor: pointer;
		display: flex;
		gap: 0.5rem;
		padding: 0.375rem 0.5rem;
		text-align: left;
		width: 100%;
	}

	.menu-item > button:hover {
		background-color: var(--color-gray-050);
	}

	.menu-item.menu-item--selected > button {
		background-color: var(--color-primary-100);
		color: var(--color-primary-700);
	}
</style>
