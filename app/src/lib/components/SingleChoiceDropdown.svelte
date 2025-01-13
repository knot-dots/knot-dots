<script lang="ts">
	import { createPopover } from 'svelte-headlessui';
	import { createPopperActions } from 'svelte-popperjs';
	import ChevronUpDown from '~icons/heroicons/chevron-up-down-20-solid';

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

<div class="dropdown-reference" use:popperRef>
	<button class="dropdown-button" type="button" use:popover.button>
		{#if selected}{selected.label}{:else}&nbsp;{/if}<ChevronUpDown />
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
		padding: 0.75rem 0.25rem 0.75rem 1rem;
		text-wrap: nowrap;
	}
</style>
