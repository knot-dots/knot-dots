<script lang="ts">
	import { _ } from 'svelte-i18n';
	import tooltip from '$lib/attachments/tooltip';
	import SingleChoiceDropdown from '$lib/components/SingleChoiceDropdown.svelte';
	import { cardStyles } from '$lib/models';

	interface Props {
		editable?: boolean;
		value: string | undefined;
	}

	let { editable = false, value = $bindable() }: Props = $props();
</script>

{#if editable}
	<SingleChoiceDropdown
		options={cardStyles.options.map((o) => ({ value: o, label: $_(`card_style.${o}`) }))}
		bind:value
	>
		{#snippet button(popover)}
			<button
				{@attach tooltip($_('card_style'))}
				class="dropdown-button"
				type="button"
				use:popover.button
			>
				<span class="badge badge--large">
					<span class="truncated">{value ? $_(`card_style.${value}`) : $_('empty')}</span>
				</span>
			</button>
		{/snippet}
	</SingleChoiceDropdown>
{:else}
	<span {@attach tooltip($_('card_style'))} class="badge badge--large">
		<span class="truncated">{value ? $_(`card_style.${value}`) : $_('empty')}</span>
	</span>
{/if}
