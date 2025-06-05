<script lang="ts">
	import type { Component } from 'svelte';
	import type { SvelteHTMLElements } from 'svelte/elements';
	import { createMenu } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import ChevronDown from '~icons/flowbite/chevron-down-outline';
	import ChevronUp from '~icons/flowbite/chevron-up-outline';
	import ColumnSolid from '~icons/flowbite/column-solid';
	import GraduationCap from '~icons/flowbite/graduation-cap-outline';
	import Grid from '~icons/flowbite/grid-solid';
	import TableRow from '~icons/flowbite/table-row-solid';
	import ChartBar from '~icons/knotdots/chart-bar';
	import ChartMixed from '~icons/knotdots/chart-mixed';
	import Clipboard from '~icons/knotdots/clipboard-simple';
	import ClipboardCheck from '~icons/knotdots/clipboard-check';
	import Compass from '~icons/knotdots/compass';
	import Dots from '~icons/knotdots/dots';
	import Gavel from '~icons/knotdots/gavel';
	import Goal from '~icons/knotdots/goal';
	import LandingPage from '~icons/knotdots/landing-page';
	import Level from '~icons/knotdots/level';
	import Strategy from '~icons/knotdots/strategy';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { boards } from '$lib/models';

	const workspacesLeft: Record<string, Record<string, string>> = {
		all: {
			catalog: '/all/catalog',
			level: '/all/level',
			page: '/',
			status: '/all/level',
			table: '/all/table'
		},
		goals: {
			catalog: '/goals/catalog',
			level: '/goals/level',
			table: '/goals/table'
		},
		indicators: {
			catalog: '/indicators'
		},
		knowledge: {
			catalog: '/knowledge/catalog',
			level: '/knowledge/level',
			table: '/knowledge/table'
		},
		measures: {
			catalog: '/measures/catalog',
			monitoring: '/measures/monitoring',
			status: '/measures/status',
			table: '/measures/table'
		},
		'objectives-and-effects': {
			level: '/objectives-and-effects'
		},
		programs: {
			catalog: '/programs/catalog',
			level: '/programs/level',
			table: '/programs/table'
		},
		resolutions: {
			catalog: '/resolutions/catalog',
			status: '/resolutions/status',
			table: '/resolutions/table'
		},
		tasks: {
			catalog: '/tasks/catalog',
			status: '/tasks/status',
			table: '/tasks/table'
		}
	};

	const workspacesRight: Record<string, Record<string, string>> = {
		catalog: {
			all: '/all/catalog',
			goals: '/goals/catalog',
			indicators: '/indicators',
			knowledge: '/knowledge/catalog',
			measures: '/measures/catalog',
			programs: '/programs/catalog',
			resolutions: '/resolutions/catalog',
			tasks: '/tasks/catalog'
		},
		level: {
			all: '/all/level',
			knowledge: '/knowledge/level',
			goals: '/goals/level',
			'objectives-and-effects': '/objectives-and-effects',
			programs: '/programs/level'
		},
		monitoring: { measures: '/measures/monitoring' },
		status: {
			measures: '/measures/status',
			resolutions: '/resolutions/status',
			tasks: '/tasks/status'
		},
		page: {
			all: '/'
		},
		table: {
			all: '/all/table',
			goals: '/goals/table',
			knowledge: '/knowledge/table',
			measures: '/measures/table',
			programs: '/programs/table',
			resolutions: '/resolutions/table',
			tasks: '/tasks/table'
		}
	};

	let selectedContext = $derived(
		page.data.currentOrganizationalUnit ?? page.data.currentOrganization
	);

	let selectedItem = $derived(
		page.url.pathname === '/' ? ['all', 'page'] : page.url.pathname.split('/').slice(1, 3)
	);

	interface Option {
		icon: Component<SvelteHTMLElements['svg']>;
		label: string;
		value: string;
	}

	let leftOptions: Option[] = $derived([
		{
			icon: Dots,
			label: $_('workspace.type.all'),
			value: workspacesLeft.all[selectedItem[1]] ?? '/all/level'
		},
		{
			icon: Strategy,
			label: $_('workspace.type.programs'),
			value: workspacesLeft.programs[selectedItem[1]] ?? '/programs/catalog'
		},
		{
			icon: Goal,
			label: $_('workspace.type.goals'),
			value: workspacesLeft.goals[selectedItem[1]] ?? '/programs/level'
		},
		{
			icon: Gavel,
			label: $_('workspace.type.resolutions'),
			value: workspacesLeft.resolutions[selectedItem[1]] ?? '/resolutions/status'
		},
		{
			icon: Clipboard,
			label: $_('workspace.type.measures'),
			value: workspacesLeft.measures[selectedItem[1]] ?? '/measures/status'
		},
		{
			icon: GraduationCap,
			label: $_('workspace.type.knowledge'),
			value: workspacesLeft.knowledge[selectedItem[1]] ?? '/knowledge/level'
		},
		...(!('default' in selectedContext.payload) || !selectedContext.payload.default
			? [
					{
						icon: ClipboardCheck,
						label: $_('workspace.type.tasks'),
						value: workspacesLeft.tasks[selectedItem[1]] ?? '/tasks/status'
					}
				]
			: []),
		...(selectedContext.payload.boards.includes(boards.enum['board.indicators'])
			? [
					{
						icon: ChartBar,
						label: $_('workspace.type.indicators'),
						value: workspacesLeft.indicators[selectedItem[1]] ?? '/indicators'
					},
					{
						icon: ChartMixed,
						label: $_('workspace.type.objectives_and_effects'),
						value:
							workspacesLeft['objectives-and-effects'][selectedItem[1]] ?? '/objectives-and-effects'
					}
				]
			: [])
	]);

	let rightOptions: Option[] = $derived([
		{
			icon: LandingPage,
			label: $_('workspace.view.page'),
			value: workspacesRight.page[selectedItem[0]] ?? '/'
		},
		{
			icon: ColumnSolid,
			label: $_('workspace.view.status'),
			value: workspacesRight.status[selectedItem[0]] ?? '/measures/status'
		},
		{
			icon: Level,
			label: $_('workspace.view.level'),
			value: workspacesRight.level[selectedItem[0]] ?? '/all/level'
		},
		{
			icon: Compass,
			label: $_('workspace.view.monitoring'),
			value: workspacesRight.monitoring[selectedItem[0]] ?? '/measures/monitoring'
		},
		{
			icon: Grid,
			label: $_('workspace.view.catalog'),
			value: workspacesRight.catalog[selectedItem[0]] ?? '/all/catalog'
		},
		{
			icon: TableRow,
			label: $_('workspace.view.table'),
			value: workspacesRight.table[selectedItem[0]] ?? '/all/table'
		}
	]);

	const leftMenu = createMenu({
		selected: page.url.pathname
	});

	const rightMenu = createMenu({
		selected: page.url.pathname
	});

	function handleChange(event: Event) {
		const detail = (event as CustomEvent).detail;

		if (detail.selected && detail.selected !== page.url.pathname) {
			const url = page.url;
			url.pathname = detail.selected;
			goto(url);
		}
	}
</script>

{#snippet dropdown(
	menu: ReturnType<typeof createMenu>,
	menuExpanded: boolean,
	menuActive: string,
	options: Option[]
)}
	{@const [popperRef, popperContent] = createPopperActions({
		placement: 'bottom',
		strategy: 'absolute'
	})}
	{@const extraOpts = {
		modifiers: [{ name: 'offset', options: { offset: [0, 4] } }]
	}}
	{@const selected = options.find(({ value }) => value === page.url.pathname)}
	<div class="dropdown" use:popperRef>
		<button class="dropdown-button" onchange={handleChange} type="button" use:menu.button>
			{#if selected?.icon}
				<selected.icon />
			{/if}
			<span class="is-visually-hidden">
				{selected?.label ?? $_('workspaces')}
			</span>
			{#if menuExpanded}<ChevronUp />{:else}<ChevronDown />{/if}
		</button>
		{#if menuExpanded}
			<div class="dropdown-panel" use:menu.items use:popperContent={extraOpts}>
				<ul class="menu">
					{#each options as option}
						{@const active = option.value === menuActive}
						<li class="menu-item">
							<button class:active type="button" use:menu.item={{ value: option.value }}>
								{#if 'icon' in option}
									<option.icon />
								{/if}
								<span>{option.label}</span>
							</button>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</div>
{/snippet}

<div class="dropdown-group">
	{@render dropdown(leftMenu, $leftMenu.expanded, $leftMenu.active, leftOptions)}
	{@render dropdown(rightMenu, $rightMenu.expanded, $rightMenu.active, rightOptions)}
</div>

<style>
	.dropdown {
		flex-shrink: 0;
	}

	.dropdown-button {
		--button-background: var(--color-gray-050);

		align-items: center;
		border-radius: 8px;
		box-shadow: var(--shadow-sm);
		height: 2.25rem;
		padding: 0.5rem 0.5rem 0.5rem 0.75rem;
	}

	.dropdown-button {
		color: var(--color-gray-900);
		font-weight: 500;
	}

	.dropdown-button:global([aria-expanded='true']) {
		background-color: var(--color-primary-100);
		color: var(--color-primary-700);
	}

	.dropdown-button:global([aria-expanded='true'] svg) {
		color: var(--color-primary-700);
	}

	.dropdown-panel {
		max-height: calc(100vh - 8rem);
		max-width: revert;
	}

	.menu-item > button {
		--button-active-background: transparent;
		--button-hover-background: var(--color-gray-100);
		--padding-x: 0.75rem;
		--padding-y: 0.5rem;

		align-items: center;
		color: var(--color-gray-900);
		border: none;
		display: flex;
		font-weight: 500;
		width: 100%;
		white-space: nowrap;
	}

	.menu-item > button.active {
		background-color: var(--color-gray-100);
	}

	.menu-item > button > :global(svg) {
		max-width: none;
	}

	.dropdown-group {
		display: none;
		flex-direction: row;
		margin-left: auto;
	}

	@container (min-width: 24rem) {
		.dropdown-group {
			display: flex;
		}
	}

	.dropdown-group > .dropdown:first-child > .dropdown-button {
		border-bottom-right-radius: 0;
		border-top-right-radius: 0;
	}

	.dropdown-group > .dropdown:last-child > .dropdown-button {
		border-bottom-left-radius: 0;
		border-top-left-radius: 0;
	}

	@layer visually-hidden {
		@container (min-width: 60rem) {
			.is-visually-hidden {
				all: revert-layer;
			}
		}
	}
</style>
