<script lang="ts">
	import { _ } from 'svelte-i18n';
	import tooltip from '$lib/attachments/tooltip';
	import SingleChoiceDropdown from '$lib/components/SingleChoiceDropdown.svelte';
	import { units } from '$lib/models';

	interface Props {
		editable?: boolean;
		offset?: [number, number];
		value: string;
	}

	let { editable = false, offset, value = $bindable() }: Props = $props();
</script>

{#if editable}
	<SingleChoiceDropdown
		{offset}
		options={units.options.map((o) => ({ value: o, label: $_(o) }))}
		bind:value
	>
		{#snippet button(popover)}
			<button
				{@attach tooltip($_('label.unit'))}
				class="dropdown-button"
				type="button"
				use:popover.button
			>
				<span class="badge badge--large">
					<span class="truncated">{$_(value ? $_(value) : 'empty')}</span>
				</span>
			</button>
		{/snippet}
	</SingleChoiceDropdown>
{:else}
	<span {@attach tooltip($_('label.unit'))} class="badge badge--large">{$_(value)}</span>
{/if}
