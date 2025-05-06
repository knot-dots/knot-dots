<script lang="ts">
	import { createPopover } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import ChevronDown from '~icons/heroicons/chevron-down-16-solid';
	import ChevronUp from '~icons/heroicons/chevron-up-16-solid';

	interface Props {
		offset?: [number, number];
		options: Array<{ label: string; value: string }>;
		value: string[];
	}

	let { offset = [0, 4], options, value = $bindable() }: Props = $props();

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
				{$_('empty')}
			{/each}
		</span>
		{#if $popover.expanded}<ChevronUp />{:else}<ChevronDown />{/if}
	</button>
	{#if $popover.expanded}
		<fieldset class="dropdown-panel" use:popperContent={extraOpts} use:popover.panel>
			<div>
				{#each options as option (option.value)}
					<label>
						<input type="checkbox" value={option.value} bind:group={value} />
						{option.label}
					</label>
				{/each}
			</div>
		</fieldset>
	{/if}
</div>

<style>
	.selected {
		display: block;
	}

	.value {
		display: block;
		padding: 0;
		text-align: left;
	}

	@container style(--drop-down-style: table) {
		.selected {
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.value {
			display: revert;
		}

		.value:not(:last-child)::after {
			content: ', ';
		}
	}
</style>
