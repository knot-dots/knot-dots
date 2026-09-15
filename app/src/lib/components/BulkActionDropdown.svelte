<script lang="ts">
	import type { FormEventHandler } from 'svelte/elements';
	import ArrowCircleDownOutline from '~icons/knotdots/arrow-circle-down-outline';
	import Dropdown from '$lib/components/Dropdown.svelte';

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
</script>

<Dropdown --dropdown-panel-border-radius="12px" {label} {offset}>
	{#snippet button(popover)}
		<button class="dropdown-button" {disabled} type="button" use:popover.button>
			<ArrowCircleDownOutline />
			<span class="truncated">
				{label}
			</span>
		</button>
	{/snippet}

	{#snippet panel(popover)}
		<fieldset class="listbox">
			{#each options as option (option.value)}
				<label>
					<input
						{disabled}
						onchange={async (e) => {
							await onchange?.(e);
							popover.close();
						}}
						type="radio"
						value={option.value}
						bind:group={value}
					/>
					<span class="truncated">{option.label}</span>
				</label>
			{/each}
		</fieldset>
	{/snippet}
</Dropdown>

<style>
	.dropdown-button {
		--dropdown-button-border-radius: 0;
		--dropdown-button-default-background: transparent;
		--dropdown-button-default-color: var(--color-text-accent-default);
		--dropdown-button-icon-default-color: var(--color-text-accent-default);
		--dropdown-button-min-height: 100%;
		--dropdown-button-padding: 0.25rem 0.5rem;

		font-weight: 400;
	}
</style>
