<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { linkStyles } from '$lib/models';
	import SingleChoiceDropdown from '$lib/components/SingleChoiceDropdown.svelte';
	import tooltip from '$lib/attachments/tooltip';

	interface Props {
		editable?: boolean;
		value: string | undefined;
	}

	let { editable = false, value = $bindable() }: Props = $props();
</script>

{#if editable}
	<SingleChoiceDropdown
		options={linkStyles.options.map((o) => ({ value: o, label: $_(`link_style.${o}`) }))}
		bind:value
	>
		{#snippet button(popover)}
			<button
				{@attach tooltip($_('teaser_link_style'))}
				class="dropdown-button"
				type="button"
				use:popover.button
			>
				<span class="badge badge--large">
					<span class="truncated">{value ? $_(`link_style.${value}`) : $_('empty')}</span>
				</span>
			</button>
		{/snippet}
	</SingleChoiceDropdown>
{:else}
	<span {@attach tooltip($_('teaser_link_style'))} class="badge badge--large">
		<span class="truncated">{value ? $_(`link_style.${value}`) : $_('empty')}</span>
	</span>
{/if}
