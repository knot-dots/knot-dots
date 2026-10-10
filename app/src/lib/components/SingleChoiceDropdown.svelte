<script lang="ts" generics="T">
	import { _ } from 'svelte-i18n';
	import Dropdown from '$lib/components/Dropdown.svelte';
	import { createPopover } from 'svelte-headlessui';
	import type { Snippet } from 'svelte';

	interface Props {
		button?: Snippet<[ReturnType<typeof createPopover>]>;
		labelledBy?: string;
		offset?: [number, number];
		options: Array<{ href?: string; label: string; value: T }>;
		value: T;
	}

	let { button, labelledBy, offset = [0, 4], options, value = $bindable() }: Props = $props();

	let selected = $derived(options.find((o) => o.value == value));
</script>

{#snippet defaultButton(popover: ReturnType<typeof createPopover>)}
	<button
		aria-labelledby={labelledBy}
		class="dropdown-button dropdown-button--select"
		type="button"
		use:popover.button
	>
		<span class="truncated">
			{#if selected}{selected.label}{:else}{$_('empty')}{/if}
		</span>
	</button>
{/snippet}

<Dropdown button={button ?? defaultButton} {offset}>
	{#snippet panel(popover)}
		<fieldset aria-labelledby={labelledBy} class="listbox">
			{#each options as option (option.value)}
				<label>
					<input
						bind:group={value}
						onchange={() => popover.close()}
						type="radio"
						value={option.value}
					/>
					<span class="truncated">{option.label}</span>
				</label>
			{/each}
		</fieldset>
	{/snippet}
</Dropdown>
