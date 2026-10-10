<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Organization from '~icons/knotdots/organization';
	import { page } from '$app/state';
	import tooltip from '$lib/attachments/tooltip';
	import SingleChoiceDropdown from '$lib/components/SingleChoiceDropdown.svelte';

	interface Props {
		editable?: boolean;
		offset?: [number, number];
		value: string;
	}

	let { editable = false, offset, value = $bindable() }: Props = $props();

	let options = $derived(
		page.data.organizations.map(({ guid, payload }) => ({
			value: guid,
			label: payload.name
		}))
	);
</script>

{#if editable}
	<SingleChoiceDropdown {offset} {options} bind:value>
		{#snippet button(popover)}
			<button
				{@attach tooltip($_('organization'))}
				class="dropdown-button module-organizing"
				type="button"
				use:popover.button
			>
				<span class="badge badge--large truncated">
					<Organization />
					{const selected = options.find((o) => o.value == value)}
					{#if selected}{selected.label}{:else}{$_('empty')}{/if}
				</span>
			</button>
		{/snippet}
	</SingleChoiceDropdown>
{:else}
	<span {@attach tooltip($_('organization'))} class="badge badge--large module-organizing">
		<Organization />
		{page.data.organizations.find(({ guid }) => guid === value)?.payload.name ?? $_('empty')}
	</span>
{/if}
