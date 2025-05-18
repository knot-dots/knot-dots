<script lang="ts">
	import { createMenu } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import ChevronDown from '~icons/heroicons/chevron-down-20-solid';
	import ChevronUp from '~icons/heroicons/chevron-up-20-solid';
	import Workspaces from '~icons/knotdots/workspaces';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	interface Props {
		indicators?: boolean;
		tasks?: boolean;
	}

	let { indicators = false, tasks = false }: Props = $props();

	const menu = createMenu({ label: $_('workspaces') });

	const groups = [
		{
			heading: $_('board.programs'),
			items: [
				{ text: $_('workspace.programs'), value: '/programs' },
				{ text: $_('workspace.programs_by_level'), value: '/programs-by-level' }
			]
		},
		{
			heading: $_('board.implementation'),
			items: [
				{ text: $_('workspace.measures'), value: '/implementation' },
				...(tasks ? [{ text: $_('workspace.tasks'), value: '/tasks' }] : []),
				{ text: $_('workspace.measure_monitoring'), value: '/measure-monitoring' },
				{ text: $_('workspace.measure_templates'), value: '/measure-templates' },
				{ text: $_('workspace.resolutions'), value: '/resolutions' }
			]
		},
		...(indicators
			? [
					{
						heading: $_('board.indicators'),
						items: [
							{ text: $_('workspace.indicators'), value: '/indicators' },

							{
								text: $_('workspace.objectives_and_effects'),
								value: '/objectives-and-effects'
							}
						]
					}
				]
			: [])
	];

	function onChange(e: Event) {
		const selected = (e as CustomEvent).detail.selected;
		if (selected) {
			goto(selected);
		}
	}
</script>

<div class="dropdown">
	<button class="button button-nav dropdown-toggle" onchange={onChange} use:menu.button>
		<span class="small-only"><Workspaces /></span>
		<span class="large-only">{$_('workspaces')}</span>
		{#if $menu.expanded}<ChevronUp />{:else}<ChevronDown />{/if}
	</button>

	{#if $menu.expanded}
		<ul use:menu.items>
			{#each groups as { heading, items }, index}
				<li class="group">
					<p id="group-{index}">{heading}</p>
					<ul role="group" aria-labelledby="group-{index}">
						{#each items as { text, value }}
							<li class:is-active={$menu.active === value}>
								<label use:menu.item={{ value }}>
									<input type="radio" checked={page.url.pathname === value} />
									{text}
								</label>
							</li>
						{/each}
					</ul>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	p {
		margin-bottom: 0.5rem;
	}

	ul {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.group {
		border: solid 1px var(--color-gray-100);
		border-radius: 8px;
		overflow-y: auto;
		padding: 0.25rem;
	}

	.dropdown {
		position: relative;
	}

	.dropdown > ul {
		background-color: white;
		border: solid 1px var(--color-gray-900);
		border-radius: 8px;
		box-shadow: var(--shadow-md);
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		max-height: calc(100vh - var(--nav-height) * 2 - 1.5rem);
		padding: 0.5rem;
		position: absolute;
		right: 0;
		top: calc(1.2em + 2 * 0.625rem + 2px + 0.5rem);
		z-index: 1;
	}

	.dropdown-toggle {
		align-items: center;
		display: flex;
		flex-shrink: 0;
		gap: 0.5rem;
		padding: 0 var(--padding-y) 0 0;
		overflow: hidden;
	}

	.dropdown-toggle > span {
		background: white;
		color: black;
		padding: var(--padding-y);
	}

	.large-only {
		display: none;
	}

	.small-only {
		border-right: solid 1px var(--button-border-color);
	}

	@container (min-inline-size: 50rem) {
		.small-only {
			display: none;
		}

		.large-only {
			border-right: solid 1px var(--button-border-color);
			display: block;
		}
	}
</style>
