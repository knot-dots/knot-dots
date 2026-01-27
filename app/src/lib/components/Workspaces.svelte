<script lang="ts">
	import { getContext } from 'svelte';
	import { createMenu } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import ChevronDown from '~icons/flowbite/chevron-down-outline';
	import ChevronUp from '~icons/flowbite/chevron-up-outline';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { boards } from '$lib/models';

	interface Props {
		options?: { label: string; value: string }[];
	}

	let overlay = getContext('overlay');

	let selectedContext = page.data.currentOrganizationalUnit ?? page.data.currentOrganization;

	let {
		options = [
			{ label: $_('workspace.all'), value: '/all/level' },
			{ label: $_('workspace.programs'), value: '/programs/catalog' },
			{ label: $_('workspace.programs_by_level'), value: '/programs/level' },
			{ label: $_('workspace.measures'), value: '/measures/status' },
			{ label: $_('workspace.resources'), value: '/resources/catalog' },
			...(!('default' in selectedContext.payload) || !selectedContext.payload.default
				? [{ label: $_('workspace.tasks'), value: '/tasks/status' }]
				: []),
			{ label: $_('workspace.measure_monitoring'), value: '/measures/monitoring' },
			{ label: $_('workspace.measure_templates'), value: '/measures/templates' },
			{ label: $_('workspace.rules'), value: '/rules/status' },
			...(selectedContext.payload.boards.includes(boards.enum['board.indicators'])
				? [
						{ label: $_('workspace.indicators'), value: '/indicators/catalog' },
						{ label: $_('workspace.objectives_and_effects'), value: '/objectives-and-effects' }
					]
				: [])
		]
	}: Props = $props();

	const menu = createMenu({ label: $_('workspaces'), selected: page.url.pathname });

	const [popperRef, popperContent] = createPopperActions({
		placement: 'bottom-start',
		strategy: 'absolute'
	});

	const extraOpts = {
		modifiers: [{ name: 'offset', options: { offset: [0, 4] } }]
	};

	function onChange(e: Event) {
		const selected = (e as CustomEvent).detail.selected;
		if (selected && selected !== page.url.pathname) {
			goto(selected);
		}
	}

	function isSelectedItem(item: { value: string }) {
		if (overlay) {
			return page.url.hash === item.value;
		} else {
			return page.url.pathname === item.value;
		}
	}
</script>

{#if options.length > 1}
	{@const selected = options.find(isSelectedItem)}
	<div class="dropdown" use:popperRef>
		<button class="dropdown-button" onchange={onChange} type="button" use:menu.button>
			<span>
				{selected?.label ?? $_('workspaces')}
			</span>
			{#if $menu.expanded}<ChevronUp />{:else}<ChevronDown />{/if}
		</button>

		{#if $menu.expanded}
			<div class="dropdown-panel" use:menu.items use:popperContent={extraOpts}>
				<ul class="menu">
					{#each options as option (option.value)}
						<li
							class="menu-item"
							class:menu-item--active={option.value === $menu.active}
							class:menu-item--selected={option.value === selected?.value}
						>
							<button use:menu.item={{ value: option.value }}>
								{option.label}
							</button>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</div>
{/if}

<style>
	.dropdown {
		flex-shrink: 0;
		margin-left: 1rem;
	}

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

	.menu-item.menu-item--selected > button {
		--icon-color: var(--color-primary-700);

		background-color: var(--color-primary-100);
		color: var(--color-primary-700);
	}
</style>
