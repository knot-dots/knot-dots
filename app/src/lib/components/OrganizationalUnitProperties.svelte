<script lang="ts">
	import { _ } from 'svelte-i18n';
	import EditableSuperordinateOrganizationalUnit from '$lib/components/EditableSuperordinateOrganizationalUnit.svelte';
	import EditableMultipleChoice from '$lib/components/EditableMultipleChoice.svelte';
	import EditableVisibility from '$lib/components/EditableVisibility.svelte';
	import EditableNumber from '$lib/components/EditableNumber.svelte';
	import type { OrganizationalUnitContainer } from '$lib/models';
	import { ability } from '$lib/stores';

	interface Props {
		container: OrganizationalUnitContainer;
		editable?: boolean;
	}

	let { container = $bindable(), editable = false }: Props = $props();
</script>

<div class="details-tab" id="basic-data">
	<div class="data-grid">
		{#if $ability.can('update', container)}
			<EditableNumber
				{editable}
				label={$_('organizational_unit.level')}
				bind:value={container.payload.level}
			/>
		{/if}

		<EditableSuperordinateOrganizationalUnit {editable} bind:container />

		<EditableMultipleChoice
			{editable}
			label={$_('boards')}
			options={['board.indicators'].map((o) => ({
				value: o,
				label: $_(o)
			}))}
			bind:value={container.payload.boards}
		/>

		{#if $ability.can('update', container, 'visibility')}
			<EditableVisibility {editable} bind:value={container.payload.visibility} />
		{/if}
	</div>
</div>
