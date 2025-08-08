<script lang="ts">
	import { createFloatingActions } from 'svelte-floating-ui';
	import { offset, flip, shift } from 'svelte-floating-ui/dom';
	import { createPopover } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import ChevronDown from '~icons/heroicons/chevron-down-16-solid';
	import ChevronUp from '~icons/heroicons/chevron-up-16-solid';

	interface Props {
		compact?: boolean;
		offset?: [number, number];
		options: Array<{ label: string; value: string }>;
		value: string[];
	}

	let {
		compact = false,
		offset: offsetArgs = [0, 4],
		options,
		value = $bindable()
	}: Props = $props();

	const popover = createPopover({});

	const [floatingRef, floatingContent] = createFloatingActions({
		middleware: [offset({ mainAxis: offsetArgs[1], crossAxis: offsetArgs[0] }), flip(), shift()],
		placement: 'bottom-start',
		strategy: 'absolute'
	});
</script>

<div class="dropdown" use:floatingRef>
	<button class="dropdown-button" type="button" use:popover.button>
		<span class="selected" class:truncated={compact}>
			{#each options.filter((o) => value.includes(o.value)) as selectedOption}
				<span class="value" class:value--compact={compact}>{selectedOption.label}</span>
			{:else}
				{$_('empty')}
			{/each}
		</span>
		{#if $popover.expanded}<ChevronUp />{:else}<ChevronDown />{/if}
	</button>
	{#if $popover.expanded}
		<fieldset class="dropdown-panel" use:floatingContent use:popover.panel>
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
	.dropdown {
		--dropdown-button-align-items: start;
	}

	.selected {
		display: block;
	}

	.value {
		display: block;
		padding: 0;
		text-align: left;
	}

	.value.value--compact {
		display: inline;
	}

	.value.value--compact:not(:last-child)::after {
		content: ', ';
	}
</style>
