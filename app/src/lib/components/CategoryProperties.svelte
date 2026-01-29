<script lang="ts">
	import { _ } from 'svelte-i18n';
	import EditablePlainText from '$lib/components/EditablePlainText.svelte';
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
		<EditablePlainText
			{editable}
			label={$_('category.key_label')}
			bind:value={container.payload.key}
		/>

		{#if $ability.can('update', container, 'visibility')}
			<EditableVisibility {editable} bind:value={container.payload.visibility} />
		{/if}
	{/snippet}

	{#snippet general()}
		<EditablePlainText
			{editable}
			label={$_('category.key_label')}
			bind:value={container.payload.key}
		/>

		{#if $ability.can('update', container, 'visibility')}
			<EditableVisibility {editable} bind:value={container.payload.visibility} />
		{/if}
	{/snippet}
</PropertyGrid>
