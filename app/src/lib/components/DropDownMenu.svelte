<script lang="ts">
	import type { Snippet } from 'svelte';
	import { createMenu } from 'svelte-headlessui';
	import { createPopperActions } from 'svelte-popperjs';
	import ChevronDown from '~icons/flowbite/chevron-down-outline';
	import ChevronUp from '~icons/flowbite/chevron-up-outline';

	interface Props {
		handleChange: (event: Event) => void;
		icon?: Snippet;
		label: string;
		options: { value: string; label: string }[];
	}

	let { handleChange, icon, label, options }: Props = $props();

	const menu = createMenu({ label });

	const [popperRef, popperContent] = createPopperActions({
		placement: 'bottom-start',
		strategy: 'absolute'
	});

	const extraOpts = {
		modifiers: [{ name: 'offset', options: { offset: [0, 4] } }]
	};
</script>

<div class="dropdown" use:popperRef>
	<button
		class="dropdown-button dropdown-button--menu"
		onchange={handleChange}
		type="button"
		use:menu.button
	>
		{#if icon}{@render icon()}{/if}
		<span>{label}</span>
		{#if $menu.expanded}<ChevronUp />{:else}<ChevronDown />{/if}
	</button>
	{#if $menu.expanded}
		<div class="dropdown-panel" use:menu.items use:popperContent={extraOpts}>
			<ul class="menu">
				{#each options as option}
					<li class="menu-item">
						<button use:menu.item={{ value: option.value }}>
							{option.label}
						</button>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>

<style>
	.dropdown {
		--dropdown-button-icon-size: 1rem;

		display: inline-block;
	}

	.dropdown-button.dropdown-button--menu {
		--button-background: transparent;
		--button-hover-border-color: var(--button-border-color);

		align-items: center;
		border: solid 1px var(--button-border-color);
		border-radius: 8px;
		height: 100%;
	}

	.dropdown-button.dropdown-button--menu > :global(svg) {
		color: inherit;
	}

	.dropdown-panel {
		max-width: revert;
	}
</style>
