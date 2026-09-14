<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Dropdown from '$lib/components/Dropdown.svelte';

	interface Props {
		labelledBy?: string;
		offset?: [number, number];
		options: Array<{ href?: string; label: string; value: string | null | undefined }>;
		value: string | null | undefined;
	}

	let { labelledBy, offset = [0, 4], options, value = $bindable() }: Props = $props();

	let selected = $derived(options.find((o) => o.value == value));
</script>

<Dropdown {offset}>
	{#snippet button(popover)}
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
