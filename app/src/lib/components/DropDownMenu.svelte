<script lang="ts">
	import type { Snippet } from 'svelte';
	import { createMenu } from 'svelte-headlessui';
	import { createPopperActions } from 'svelte-popperjs';
	import ChevronDown from '~icons/heroicons/chevron-down-16-solid';
	import ChevronUp from '~icons/heroicons/chevron-up-16-solid';

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
	<button onchange={handleChange} type="button" use:menu.button>
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
	.menu-item > button {
		--button-active-background: transparent;
		--button-hover-background: var(--color-gray-100);
		--padding-x: 0.75rem;
		--padding-y: 0.5rem;

		border: none;
		width: 100%;
	}
</style>
