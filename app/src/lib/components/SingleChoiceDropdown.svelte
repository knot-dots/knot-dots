<script lang="ts">
	import { createPopover } from 'svelte-headlessui';
	import { createPopperActions } from 'svelte-popperjs';
	import ChevronDown from '~icons/heroicons/chevron-down-16-solid';

	interface Props {
		handleChange: (event: Event) => void;
		options: Array<{ href?: string; label: string; value: string | undefined }>;
		value: string | null | undefined;
	}

	let { handleChange, options, value = $bindable() }: Props = $props();
	let selected = $derived(options.find((o) => o.value == value));

	const popover = createPopover({});

	const [popperRef, popperContent] = createPopperActions({
		placement: 'bottom-start',
		strategy: 'absolute'
	});

	const extraOpts = {
		modifiers: [{ name: 'offset', options: { offset: [0, 4] } }]
	};
</script>

<div class="dropdown" use:popperRef>
	<button class="dropdown-button" type="button" use:popover.button>
		{#if selected}{selected.label}{:else}&nbsp;{/if}<ChevronDown />
	</button>
	{#if $popover.expanded}
		<fieldset class="dropdown-panel" use:popperContent={extraOpts} use:popover.panel>
			{#each options as option (option.value)}
				<label>
					<input type="radio" value={option.value} bind:group={value} onchange={handleChange} />
					{option.label}
				</label>
			{/each}
		</fieldset>
	{/if}
</div>

<style>
	button {
		border: none;
		text-wrap: nowrap;
	}

	@container style(--drop-down-style: table) {
		button > :global(svg) {
			display: none;
		}
	}
</style>
