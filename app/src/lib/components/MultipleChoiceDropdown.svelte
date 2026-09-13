<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Dropdown from '$lib/components/Dropdown.svelte';

	interface Props {
		compact?: boolean;
		labelledBy?: string;
		offset?: [number, number];
		options: Array<{ label: string; value: string }>;
		value: string[];
	}

	let {
		compact = false,
		labelledBy,
		offset = [0, 4],
		options,
		value = $bindable()
	}: Props = $props();
</script>

<Dropdown {offset}>
	{#snippet button(popover)}
		<button
			aria-labelledby={labelledBy}
			class="dropdown-button dropdown-button--select"
			type="button"
			use:popover.button
		>
			<span class="selected" class:truncated={compact}>
				{#each options.filter( (o) => value.includes(o.value) ) as selectedOption (selectedOption.value)}
					<span class="value truncated" class:value--compact={compact}>{selectedOption.label}</span>
				{:else}
					{$_('empty')}
				{/each}
			</span>
		</button>
	{/snippet}

	{#snippet panel()}
		<fieldset aria-labelledby={labelledBy} class="listbox">
			{#each options as option (option.value)}
				<label>
					<input type="checkbox" value={option.value} bind:group={value} />
					<span class="truncated">{option.label}</span>
				</label>
			{/each}
		</fieldset>
	{/snippet}
</Dropdown>

<style>
	.selected {
		display: block;
		min-width: 0;
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
