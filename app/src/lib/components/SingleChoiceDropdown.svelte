<script lang="ts">
	import { createPopover } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import ChevronDown from '~icons/heroicons/chevron-down-16-solid';
	import ChevronUp from '~icons/heroicons/chevron-up-16-solid';

	interface Props {
		labelledBy?: string;
		offset?: [number, number];
		options: Array<{ href?: string; label: string; value: string | null | undefined }>;
		value: string | null | undefined;
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	interface $$Events {
		change: Event;
	}

	let { labelledBy, offset = [0, 4], options, value = $bindable() }: Props = $props();
	let selected = $derived(options.find((o) => o.value == value));

	const popover = createPopover({});

	const [popperRef, popperContent] = createPopperActions({
		placement: 'bottom-start',
		strategy: 'absolute'
	});

	const extraOpts = $derived({
		modifiers: [{ name: 'offset', options: { offset } }]
	});
</script>

<div class="dropdown" use:popperRef>
	<button aria-labelledby={labelledBy} class="dropdown-button" type="button" use:popover.button>
		<span class="truncated">
			{#if selected}{selected.label}{:else}{$_('empty')}{/if}
		</span>
		{#if $popover.expanded}<ChevronUp />{:else}<ChevronDown />{/if}
	</button>
	{#if $popover.expanded}
		<fieldset
			aria-labelledby={labelledBy}
			class="dropdown-panel"
			use:popperContent={extraOpts}
			use:popover.panel
		>
			<div>
				{#each options as option (option.value)}
					<label>
						<input type="radio" value={option.value} bind:group={value} />
						<span class="truncated">{option.label}</span>
					</label>
				{/each}
			</div>
		</fieldset>
	{/if}
</div>
