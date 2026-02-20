<script lang="ts">
	import EditableVisibility from '$lib/components/EditableVisibility.svelte';
	import PropertyGrid from '$lib/components/PropertyGrid.svelte';
	import { type CategoryContainer } from '$lib/models';
	import { ability } from '$lib/stores';

	interface Props {
		container: CategoryContainer;
		editable?: boolean;
	}

	let { container = $bindable(), editable = false }: Props = $props();
</script>

<PropertyGrid>
	{#snippet top()}
		{#if $ability.can('update', container, 'visibility')}
			<EditableVisibility {editable} bind:value={container.payload.visibility} />
		{/if}
	{/snippet}

	{#snippet general()}
		{#if $ability.can('update', container, 'visibility')}
			<EditableVisibility {editable} bind:value={container.payload.visibility} />
		{/if}
	{/snippet}
</PropertyGrid>
