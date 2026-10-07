<script lang="ts">
	import { _ } from 'svelte-i18n';
	import OrganizationalUnit from '~icons/knotdots/organizational-unit';
	import { page } from '$app/state';
	import tooltip from '$lib/attachments/tooltip';
	import SingleChoiceDropdown from '$lib/components/SingleChoiceDropdown.svelte';

	interface Props {
		editable?: boolean;
		offset?: [number, number];
		organization: string;
		value: string | null;
	}

	let { editable = false, offset, organization, value = $bindable() }: Props = $props();

	let options = $derived([
		{ label: $_('empty'), value: null },
		...page.data.organizationalUnits
			.filter((ou) => ou.organization == organization)
			.map(({ guid, payload }) => ({
				value: guid,
				label: payload.name
			}))
	]);
</script>

{#if editable}
	<SingleChoiceDropdown {offset} {options} bind:value>
		{#snippet button(popover)}
			<button
				{@attach tooltip($_('organizational_unit'))}
				class="dropdown-button module-organizing"
				type="button"
				use:popover.button
			>
				<span class="badge badge--large truncated">
					<OrganizationalUnit />
					{const selected = options.find((o) => o.value == value)}
					{#if selected}{selected.label}{:else}{$_('empty')}{/if}
				</span>
			</button>
		{/snippet}
	</SingleChoiceDropdown>
{:else}
	<span {@attach tooltip($_('organizational_unit'))} class="badge badge--large module-organizing">
		<OrganizationalUnit />
		{page.data.organizationalUnits.find(({ guid }) => guid === value)?.payload.name ?? $_('empty')}
	</span>
{/if}
