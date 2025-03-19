<script lang="ts">
	import { createPopover } from 'svelte-headlessui';
	import { createPopperActions } from 'svelte-popperjs';
	import requestSubmit from '$lib/client/requestSubmit';

	interface Props {
		editable?: boolean;
		value: string;
	}

	let { editable = false, value = $bindable() }: Props = $props();

	let timer: ReturnType<typeof setTimeout>;

	const popover = createPopover();

	const [popperRef, popperContent] = createPopperActions({
		placement: 'bottom-start',
		strategy: 'absolute'
	});

	const extraOpts = {
		modifiers: [{ name: 'offset', options: { offset: [-24, -39] } }]
	};

	function debouncedSubmit(event: Event) {
		clearTimeout(timer);
		timer = setTimeout(async () => {
			requestSubmit(event);
		}, 2000);
	}

	function init(element: HTMLElement) {
		element.focus();
	}
</script>

<div class="dropdown" use:popperRef>
	<button class="dropdown-button truncated" type="button" use:popover.button>
		{value}
	</button>
	{#if $popover.expanded}
		<div class="dropdown-panel" use:popperContent={extraOpts} use:popover.panel>
			{#if editable}
				<h3
					contenteditable="plaintext-only"
					bind:textContent={value}
					oninput={debouncedSubmit}
					onkeydown={(e) => (e.key === 'Enter' ? e.preventDefault() : null)}
					use:init
				></h3>
			{:else}
				<h3 class="truncated">{value}</h3>
			{/if}
		</div>
	{/if}
</div>

<style>
	h3 {
		color: var(--color-gray-900);
		font-size: inherit;
		font-weight: 500;
		padding: 0.75rem 1rem;
	}

	.dropdown-button {
		color: var(--color-gray-900);
		display: block;
		font-size: inherit;
		font-weight: 500;
		text-align: left;
		width: 100%;
	}

	.dropdown-panel {
		border: solid 1px var(--color-gray-300);
		border-radius: 0.5rem;
		white-space: wrap;
		width: 50%;
	}
</style>
