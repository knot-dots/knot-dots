<script lang="ts">
	import type { Component } from 'svelte';
	import type { SvelteHTMLElements } from 'svelte/elements';
	import { createMenu } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import ChevronDown from '~icons/flowbite/chevron-down-outline';
	import ChevronUp from '~icons/flowbite/chevron-up-outline';
	import ColumnSolid from '~icons/flowbite/column-solid';
	import ClipboardCheck from '~icons/knotdots/clipboard-check';
	import Compass from '~icons/knotdots/compass';
	import Dots from '~icons/knotdots/dots';
	import LandingPage from '~icons/knotdots/landing-page';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { type AnyContainer, overlayKey, overlayURL, paramsFromFragment } from '$lib/models';

	interface Props {
		container: AnyContainer;
	}

	let { container }: Props = $props();

	const workspacesLeft: Record<string, Record<string, string>> = {
		all: {
			monitoring: '/all/monitoring',
			page: '/'
		},
		tasks: {
			status: '/tasks/status'
		}
	};

	const workspacesRight: Record<string, Record<string, string>> = {
		monitoring: {
			all: '/all/monitoring'
		},
		status: {
			tasks: '/tasks/status'
		},
		page: {
			all: '/'
		}
	};

	let selectedItem = $derived.by(() => {
		const params = paramsFromFragment(page.url);

		if (params.has('measure-monitoring')) {
			return ['all', 'monitoring'];
		} else if (params.has('tasks')) {
			return ['tasks', 'status'];
		} else {
			return ['all', 'page'];
		}
	});

	interface Option {
		exists: boolean;
		icon: Component<SvelteHTMLElements['svg']>;
		label: string;
		value: string;
	}

	let leftOptions: Option[] = $derived([
		{
			exists: true,
			icon: Dots,
			label: $_('workspace.type.all'),
			value: workspacesLeft.all[selectedItem[1]] ?? '/all/monitoring'
		},
		{
			exists: true,
			icon: ClipboardCheck,
			label: $_('workspace.type.tasks'),
			value: workspacesLeft.tasks[selectedItem[1]] ?? '/tasks/status'
		}
	]);

	let rightOptions: Option[] = $derived([
		{
			exists: selectedItem[0] in workspacesRight.page,
			icon: LandingPage,
			label: $_('workspace.view.page'),
			value: workspacesRight.page[selectedItem[0]] ?? '/all/page'
		},

		{
			exists: selectedItem[0] in workspacesRight.status,
			icon: ColumnSolid,
			label: $_('workspace.view.status'),
			value: workspacesRight.status[selectedItem[0]] ?? '/tasks/status'
		},

		{
			exists: selectedItem[0] in workspacesRight.monitoring,
			icon: Compass,
			label: $_('workspace.view.monitoring'),
			value: workspacesRight.monitoring[selectedItem[0]] ?? '/all/monitoring'
		}
	]);

	function pathFromParams(params: URLSearchParams) {
		if (params.has('measure-monitoring')) {
			return '/all/monitoring';
		} else if (params.has('tasks')) {
			return '/tasks/status';
		} else {
			return '/';
		}
	}

	const leftMenu = createMenu({
		selected: pathFromParams(paramsFromFragment(page.url))
	});

	const rightMenu = createMenu({
		selected: pathFromParams(paramsFromFragment(page.url))
	});

	function handleChange(url: URL, container: AnyContainer) {
		return (event: Event) => {
			const detail = (event as CustomEvent).detail;

			if (detail.selected) {
				const selected =
					detail.selected === '/' ? ['all', 'page'] : detail.selected.split('/').slice(1, 3);

				if (selected[0] == 'all' && selected[1] == 'monitoring') {
					goto(overlayURL(url, overlayKey.enum['measure-monitoring'], container.guid));
				} else if (selected[0] == 'tasks' && selected[1] == 'status') {
					goto(overlayURL(url, overlayKey.enum.tasks, container.guid));
				} else {
					goto(overlayURL(url, overlayKey.enum.view, container.guid));
				}
			}
		};
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
	{@const selected = options.find(
		({ value }) => value === pathFromParams(paramsFromFragment(page.url))
	)}
	<div class="dropdown" use:popperRef>
		<button
			class="dropdown-button"
			onchange={handleChange(page.url, container)}
			type="button"
			use:menu.button
		>
			{#if selected?.icon}
				<selected.icon />
			{/if}
			<span class="is-visually-hidden is-visually-hidden--mobile-only">
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

	.menu-item.menu-item--muted > button {
		--icon-color: var(--color-gray-400);

		color: var(--color-gray-400);
		gap: 0.625rem;
	}

	.menu-item.menu-item--selected > button {
		--icon-color: var(--color-primary-700);

		background-color: var(--color-primary-100);
		color: var(--color-primary-700);
	}

	.dropdown-group {
		display: none;
		flex-direction: row;
		margin-left: auto;
	}

	@container (min-width: 30rem) {
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
