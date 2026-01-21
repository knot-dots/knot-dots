<script lang="ts">
	import AuthoredBy from '$lib/components/AuthoredBy.svelte';
	import EditableDuration from '$lib/components/EditableDuration.svelte';
	import EditableEditorialState from '$lib/components/EditableEditorialState.svelte';
	import EditableMeasureType from '$lib/components/EditableMeasureType.svelte';
	import EditableOrganization from '$lib/components/EditableOrganization.svelte';
	import EditableOrganizationalUnit from '$lib/components/EditableOrganizationalUnit.svelte';
	import EditableParent from '$lib/components/EditableParent.svelte';
	import EditableProgram from '$lib/components/EditableProgram.svelte';
	import EditableStatus from '$lib/components/EditableStatus.svelte';
	import EditableVisibility from '$lib/components/EditableVisibility.svelte';
	import EditableCategories from '$lib/components/EditableCategories.svelte';
	import ManagedBy from '$lib/components/ManagedBy.svelte';
	import PropertyGrid from '$lib/components/PropertyGrid.svelte';
	import type { AnyContainer, Container, ContainerWithEffect } from '$lib/models';
	import { ability } from '$lib/stores';

	interface Props {
		container: ContainerWithEffect;
		editable?: boolean;
		relatedContainers: Container[];
		revisions: AnyContainer[];
	}

	let { container = $bindable(), editable = false, relatedContainers, revisions }: Props = $props();
</script>

<PropertyGrid>
	{#snippet top()}
		<EditableDuration {editable} bind:container />

		<EditableProgram {editable} bind:container />

		<ManagedBy {container} {relatedContainers} />

		<EditableOrganizationalUnit
			editable={editable && $ability.can('update', container.payload.type, 'organizational_unit')}
			organization={container.organization}
			bind:value={container.organizational_unit}
		/>
	{/snippet}

	{#snippet general()}
		<EditableMeasureType {editable} bind:value={container.payload.measureType} />

		<EditableStatus {editable} bind:value={container.payload.status} />

		{#if $ability.can('read', container, 'payload.editorialState')}
			<EditableEditorialState
				aiSuggestion={container.payload.aiSuggestion}
				editable={editable && $ability.can('update', container, 'payload.editorialState')}
				bind:value={container.payload.editorialState}
			/>
		{/if}

		<EditableDuration {editable} bind:container />

		<EditableProgram {editable} bind:container />

		<EditableParent {editable} bind:container />

		{#if $ability.can('update', container, 'visibility')}
			<EditableVisibility {editable} bind:value={container.payload.visibility} />
		{/if}
	{/snippet}

	{#snippet categories()}
		<EditableCategories
			bind:container
			editable={editable}
			organizationGuid={container.organization}
		/>
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
