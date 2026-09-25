<script lang="ts">
	import type { Snippet } from 'svelte';
	import { createPopover } from 'svelte-headlessui';
	import { createPopperActions } from 'svelte-popperjs';

	interface Props {
		button?: Snippet<[ReturnType<typeof createPopover>]>;
		panel?: Snippet<[ReturnType<typeof createPopover>]>;
		label?: string;
		offset?: [number, number];
		strategy?: 'absolute' | 'fixed';
	}

	let { button, panel, label, offset = [0, 4], strategy = 'absolute' }: Props = $props();

	const popover = createPopover({
		get label() {
			return label;
		}
	});

	const [popperRef, popperContent] = createPopperActions({
		placement: 'bottom-start'
	});

	const extraOptions = $derived({
		modifiers: [{ name: 'offset', options: { offset } }],
		strategy
	});
</script>

<div class="dropdown" use:popperRef>
	{#if button}
		{@render button(popover)}
	{:else}
		<button class="dropdown-button" type="button" use:popover.button>
			{label}
		</button>
	{/if}

	{#if $popover.expanded}
		<div class="dropdown-panel" use:popover.panel use:popperContent={extraOptions}>
			{@render panel?.(popover)}
		</div>
	{/if}
</div>
