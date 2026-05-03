<script lang="ts">
	import AuthoredBy from '$lib/components/AuthoredBy.svelte';
	import EditableEditorialState from '$lib/components/EditableEditorialState.svelte';
	import EditableIndicatorCategory from '$lib/components/EditableIndicatorCategory.svelte';
	import EditableIndicatorType from '$lib/components/EditableIndicatorType.svelte';
	import EditableOrganization from '$lib/components/EditableOrganization.svelte';
	import EditableOrganizationalUnit from '$lib/components/EditableOrganizationalUnit.svelte';
	import EditableVisibility from '$lib/components/EditableVisibility.svelte';
	import EditableCategories from '$lib/components/EditableCategories.svelte';
	import ManagedBy from '$lib/components/ManagedBy.svelte';
	import PropertyGrid from '$lib/components/PropertyGrid.svelte';
	import { type AnyContainer, type BinaryIndicatorContainer } from '$lib/models';
	import { ability } from '$lib/stores';

	interface Props {
		container: BinaryIndicatorContainer;
		editable?: boolean;
		relatedContainers: AnyContainer[];
		revisions: AnyContainer[];
	}

	let { container = $bindable(), editable = false, relatedContainers, revisions }: Props = $props();
</script>

<PropertyGrid>
	{#snippet top()}
		<EditableIndicatorType {editable} bind:value={container.payload.indicatorType} />

		{#if $ability.can('update', container, 'indicatorCategory')}
			<EditableIndicatorCategory {editable} bind:value={container.payload.indicatorCategory} />
		{/if}
	{/snippet}

	{#snippet general()}
		<EditableIndicatorType {editable} bind:value={container.payload.indicatorType} />

		{#if $ability.can('update', container, 'indicatorCategory')}
			<EditableIndicatorCategory {editable} bind:value={container.payload.indicatorCategory} />
		{/if}

		{#if $ability.can('read', container, 'payload.editorialState')}
			<EditableEditorialState
				aiSuggestion={container.payload.aiSuggestion}
				editable={editable && $ability.can('update', container, 'payload.editorialState')}
				bind:value={container.payload.editorialState}
			/>
		{/if}

		{#if $ability.can('update', container, 'visibility')}
			<EditableVisibility {editable} bind:container {relatedContainers} />
		{/if}
	{/snippet}

	{#snippet categories()}
		<EditableCategories bind:container {editable} />
	{/snippet}

	{#snippet ownership()}
		<ManagedBy {container} {relatedContainers} />

		<EditableOrganizationalUnit
			editable={editable && $ability.can('update', container.payload.type, 'organizational_unit')}
			organization={container.organization}
			bind:value={container.organizational_unit}
		/>

		<EditableOrganization
			editable={editable && $ability.can('update', container.payload.type, 'organization')}
			bind:value={container.organization}
		/>

		<AuthoredBy {container} {revisions} />
	{/snippet}
</PropertyGrid>
