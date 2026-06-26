<script lang="ts">
	import type { FormEventHandler } from 'svelte/elements';
	import { createPopover } from 'svelte-headlessui';
	import { createPopperActions } from 'svelte-popperjs';
	import ArrowCircleDownOutline from '~icons/knotdots/arrow-circle-down-outline';

	interface Props {
		disabled?: boolean;
		label: string;
		offset?: [number, number];
		onchange?: FormEventHandler<HTMLInputElement>;
		options: Array<{ label: string; value: string | undefined }>;
		value: string | undefined;
	}

	let {
		disabled = false,
		label,
		offset = [0, 4],
		onchange,
		options,
		value = $bindable()
	}: Props = $props();

	const popover = $derived(createPopover({ label }));

	const [popperRef, popperContent] = createPopperActions({
		placement: 'bottom',
		strategy: 'absolute'
	});

	const extraOpts = $derived({
		modifiers: [{ name: 'offset', options: { offset } }]
	});
</script>

<div class="dropdown" use:popperRef>
	<button class="dropdown-button" {disabled} type="button" use:popover.button>
		<ArrowCircleDownOutline />
		<span class="truncated">
			{label}
		</span>
	</button>

	{#if $popover.expanded}
		<fieldset class="dropdown-panel" use:popperContent={extraOpts} use:popover.panel>
			<div>
				{#each options as option (option.value)}
					<label>
						<input {disabled} {onchange} type="radio" value={option.value} bind:group={value} />
						<span class="truncated">{option.label}</span>
					</label>
				{/each}
			</div>
		</fieldset>
	{/if}
</div>

<style>
	.dropdown {
		--dropdown-button-border-radius: 0;
		--dropdown-button-default-background: transparent;
		--dropdown-button-default-color: var(--color-text-accent-default);
		--dropdown-button-icon-default-color: var(--color-text-accent-default);
		--dropdown-button-min-height: 100%;
		--dropdown-button-padding: 0.375rem 0.5rem;
	}

	.dropdown-button {
		font-weight: 400;
	}

	.dropdown-panel {
		border-radius: 12px;
		box-shadow: var(--shadow-lg);
	}
</style>
