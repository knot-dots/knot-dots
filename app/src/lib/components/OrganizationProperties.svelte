<script lang="ts">
	import { _ } from 'svelte-i18n';
	import EditableOrganizationCategory from '$lib/components/EditableOrganizationCategory.svelte';
	import EditableMultipleChoice from '$lib/components/EditableMultipleChoice.svelte';
	import EditableVisibility from '$lib/components/EditableVisibility.svelte';
	import type { OrganizationContainer } from '$lib/models';
	import { ability } from '$lib/stores';

	interface Props {
		container: OrganizationContainer;
		editable?: boolean;
	}

	let { container = $bindable(), editable = false }: Props = $props();
</script>

<div class="details-tab" id="basic-data">
	<div class="data-grid">
		<EditableOrganizationCategory {editable} bind:value={container.payload.organizationCategory} />

		<EditableMultipleChoice
			{editable}
			label={$_('boards')}
			options={['board.indicators', 'board.organizational_units'].map((o) => ({
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
