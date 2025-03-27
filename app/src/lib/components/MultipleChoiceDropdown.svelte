<script lang="ts">
	import { createPopover } from 'svelte-headlessui';
	import { createPopperActions } from 'svelte-popperjs';
	import ChevronDown from '~icons/heroicons/chevron-down-16-solid';

	interface Props {
		handleChange: (event: Event) => void;
		offset?: [number, number];
		options: Array<{ label: string; value: string }>;
		value: string[];
	}

	let { handleChange, offset = [0, 4], options, value = $bindable() }: Props = $props();

	const popover = createPopover({});

	const [popperRef, popperContent] = createPopperActions({
		placement: 'bottom-start',
		strategy: 'absolute'
	});

	const extraOpts = {
		modifiers: [{ name: 'offset', options: { offset } }]
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
		<ChevronDown />
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
		width: 100%;
	}

	.selected {
		display: block;
	}

	.value {
		padding: 0;
		text-align: left;
	}

	.value:not(:last-child)::after {
		content: ', ';
	}

	@container style(--drop-down-style: table) {
		button > :global(svg) {
			display: none;
		}

		.selected {
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
	}
</style>
