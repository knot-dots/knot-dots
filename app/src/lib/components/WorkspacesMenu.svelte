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
	import Star from '~icons/knotdots/star';
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
		exists: boolean;
		icon: Component<SvelteHTMLElements['svg']>;
		label: string;
		recommended: boolean;
		value: string;
	}

	let leftOptions: Option[] = $derived([
		{
			exists: selectedItem[1] in workspacesLeft.all,
			icon: Dots,
			label: $_('workspace.type.all'),
			recommended: selectedItem[1] == 'level',
			value: workspacesLeft.all[selectedItem[1]] ?? '/all/level'
		},
		{
			exists: selectedItem[1] in workspacesLeft.programs,
			icon: Strategy,
			label: $_('workspace.type.programs'),
			recommended: selectedItem[1] == 'catalog',
			value: workspacesLeft.programs[selectedItem[1]] ?? '/programs/catalog'
		},
		{
			exists: selectedItem[1] in workspacesLeft.goals,
			icon: Goal,
			label: $_('workspace.type.goals'),
			recommended: selectedItem[1] == 'level',
			value: workspacesLeft.goals[selectedItem[1]] ?? '/programs/level'
		},
		{
			exists: selectedItem[1] in workspacesLeft.resolutions,
			icon: Gavel,
			label: $_('workspace.type.resolutions'),
			recommended: selectedItem[1] == 'status',
			value: workspacesLeft.resolutions[selectedItem[1]] ?? '/resolutions/status'
		},
		{
			exists: selectedItem[1] in workspacesLeft.measures,
			icon: Clipboard,
			label: $_('workspace.type.measures'),
			recommended: selectedItem[1] == 'status',
			value: workspacesLeft.measures[selectedItem[1]] ?? '/measures/status'
		},
		{
			exists: selectedItem[1] in workspacesLeft.knowledge,
			icon: GraduationCap,
			label: $_('workspace.type.knowledge'),
			recommended: selectedItem[1] == 'level',
			value: workspacesLeft.knowledge[selectedItem[1]] ?? '/knowledge/level'
		},
		...(!('default' in selectedContext.payload) || !selectedContext.payload.default
			? [
					{
						exists: selectedItem[1] in workspacesLeft.tasks,
						icon: ClipboardCheck,
						label: $_('workspace.type.tasks'),
						recommended: selectedItem[1] == 'status',
						value: workspacesLeft.tasks[selectedItem[1]] ?? '/tasks/status'
					}
				]
			: []),
		...(selectedContext.payload.boards.includes(boards.enum['board.indicators'])
			? [
					{
						exists: selectedItem[1] in workspacesLeft.indicators,
						icon: ChartBar,
						label: $_('workspace.type.indicators'),
						recommended: selectedItem[1] == 'catalog',
						value: workspacesLeft.indicators[selectedItem[1]] ?? '/indicators'
					},
					{
						exists: selectedItem[1] in workspacesLeft['objectives-and-effects'],
						icon: ChartMixed,
						label: $_('workspace.type.objectives_and_effects'),
						recommended: selectedItem[1] == 'level',
						value:
							workspacesLeft['objectives-and-effects'][selectedItem[1]] ?? '/objectives-and-effects'
					}
				]
			: [])
	]);

	let rightOptions: Option[] = $derived([
		{
			exists: selectedItem[0] in workspacesRight.page,
			icon: LandingPage,
			label: $_('workspace.view.page'),
			recommended: false,
			value: workspacesRight.page[selectedItem[0]] ?? '/'
		},
		{
			exists: selectedItem[0] in workspacesRight.status,
			icon: ColumnSolid,
			label: $_('workspace.view.status'),
			recommended: ['measures', 'resolutions', 'tasks'].includes(selectedItem[0]),
			value: workspacesRight.status[selectedItem[0]] ?? '/measures/status'
		},
		{
			exists: selectedItem[0] in workspacesRight.level,
			icon: Level,
			label: $_('workspace.view.level'),
			recommended: ['all', 'goals', 'knowledge', 'objectives-and-effects'].includes(
				selectedItem[0]
			),
			value: workspacesRight.level[selectedItem[0]] ?? '/all/level'
		},
		{
			exists: selectedItem[0] in workspacesRight.monitoring,
			icon: Compass,
			label: $_('workspace.view.monitoring'),
			recommended: selectedItem[0] == 'measures',
			value: workspacesRight.monitoring[selectedItem[0]] ?? '/measures/monitoring'
		},
		{
			exists: selectedItem[0] in workspacesRight.catalog,
			icon: Grid,
			label: $_('workspace.view.catalog'),
			recommended: selectedItem[0] == 'indicators',
			value: workspacesRight.catalog[selectedItem[0]] ?? '/all/catalog'
		},
		{
			exists: selectedItem[0] in workspacesRight.table,
			icon: TableRow,
			label: $_('workspace.view.table'),
			recommended: false,
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
			const url = new URL(page.url);
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
						<li
							class="menu-item"
							class:menu-item--active={option.value === menuActive}
							class:menu-item--muted={!option.exists}
							class:menu-item--selected={option.value === selected?.value}
						>
							<button type="button" use:menu.item={{ value: option.value }}>
								<option.icon />
								{#if option.recommended}
									<span class="recommendation">
										<Star />
									</span>
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
	.dropdown-button {
		--button-background: var(--color-gray-050);

		align-items: center;
		border-radius: 8px;
		box-shadow: var(--shadow-sm);
		color: var(--color-gray-900);
		font-weight: 500;
		height: 2.25rem;
		padding: 0.5rem 0.5rem 0.5rem 0.75rem;
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
		position: relative;
		width: 100%;
		white-space: nowrap;
	}

	.menu-item:nth-child(n + 2) {
		margin-top: 0.25rem;
	}

	.menu-item.menu-item--muted > button {
		--icon-color: var(--color-gray-400);

		color: var(--color-gray-400);
		gap: 0.625rem;
	}

	.menu-item.menu-item--active > button {
		background-color: var(--color-gray-100);
	}

	.menu-item.menu-item--selected > button {
		--icon-color: var(--color-primary-700);

		background-color: var(--color-primary-100);
		color: var(--color-primary-700);
	}

	.menu-item > button > :global(svg) {
		height: 1.5rem;
		max-width: none;
		width: 1.5rem;
	}

	.recommendation {
		--icon-color: var(--color-primary-500);

		height: 0.5rem;
		left: 2.125rem;
		position: absolute;
		top: 0;
		width: 0.5rem;
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
