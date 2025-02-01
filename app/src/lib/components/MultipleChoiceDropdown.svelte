<script lang="ts">
	import { createPopover } from 'svelte-headlessui';
	import { createPopperActions } from 'svelte-popperjs';
	import ChevronUpDown from '~icons/heroicons/chevron-up-down-20-solid';

	interface Props {
		handleChange: (event: Event) => void;
		options: Array<{ label: string; value: string }>;
		value: string[];
	}

	let { handleChange, options, value = $bindable() }: Props = $props();
	let selected = $derived(options.filter((o) => value.includes(o.value)).map(({ label }) => label));

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
		<span class="selected">
			{#each options.filter((o) => value.includes(o.value)) as selectedOption}
				<span class="value">{selectedOption.label}</span>
			{:else}
				&nbsp;
			{/each}
		</span>
		<ChevronUpDown />
	</button>
	{#if $popover.expanded}
		<fieldset class="dropdown-panel" use:popperContent={extraOpts} use:popover.panel>
			{#each options as option (option.value)}
				<label>
					<input type="checkbox" value={option.value} bind:group={value} onchange={handleChange} />
					{option.label}
				</label>
			{/each}
		</fieldset>
	{/if}
</div>

<style>
	button {
		border: none;
		min-width: 3rem;
		padding: 0.75rem 0.25rem 0.75rem 1rem;
	}

	.selected {
		display: block;
	}

	.value {
		display: list-item;
		list-style: none;
		padding: 0;
		text-align: left;
		text-wrap: nowrap;
	}
</style>
