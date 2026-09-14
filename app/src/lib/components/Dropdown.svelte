<script lang="ts">
	import type { Snippet } from 'svelte';
	import { createPopover } from 'svelte-headlessui';
	import { createPopperActions } from 'svelte-popperjs';

	interface Props {
		button?: Snippet<[ReturnType<typeof createPopover>]>;
		panel?: Snippet<[ReturnType<typeof createPopover>]>;
		label?: string;
		offset?: [number, number];
	}

	let { button, panel, label, offset = [0, 4] }: Props = $props();

	const popover = createPopover({
		get label() {
			return label;
		}
	});

	const [popperRef, popperContent] = createPopperActions({
		placement: 'bottom-start',
		strategy: 'absolute'
	});

	const extraOptions = $derived({
		modifiers: [{ name: 'offset', options: { offset } }]
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
