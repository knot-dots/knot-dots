<script lang="ts">
	import AuthoredBy from '$lib/components/AuthoredBy.svelte';
	import EditableAudience from '$lib/components/EditableAudience.svelte';
	import EditableCategory from '$lib/components/EditableCategory.svelte';
	import EditableDuration from '$lib/components/EditableDuration.svelte';
	import EditableEditorialState from '$lib/components/EditableEditorialState.svelte';
	import EditableFile from '$lib/components/EditableFile.svelte';
	import EditableMeasureType from '$lib/components/EditableMeasureType.svelte';
	import EditableOrganization from '$lib/components/EditableOrganization.svelte';
	import EditableOrganizationalUnit from '$lib/components/EditableOrganizationalUnit.svelte';
	import EditableParent from '$lib/components/EditableParent.svelte';
	import EditablePolicyFieldBNK from '$lib/components/EditablePolicyFieldBNK.svelte';
	import EditableProgram from '$lib/components/EditableProgram.svelte';
	import EditableStatus from '$lib/components/EditableStatus.svelte';
	import EditableTopic from '$lib/components/EditableTopic.svelte';
	import EditableVisibility from '$lib/components/EditableVisibility.svelte';
	import ManagedBy from '$lib/components/ManagedBy.svelte';
	import PropertyGrid from '$lib/components/PropertyGrid.svelte';
	import { type ContainerWithEffect, isSimpleMeasureContainer } from '$lib/models';
	import { ability } from '$lib/stores';

	interface Props {
		container: ContainerWithEffect;
		editable?: boolean;
		relatedContainers: any[];
		revisions: any[];
	}

	let { container = $bindable(), editable = false, relatedContainers, revisions }: Props = $props();
</script>

<PropertyGrid>
	{#snippet top()}
		<EditableDuration {editable} bind:container />

		<EditableProgram {editable} bind:container />

		<EditableCategory {editable} bind:value={container.payload.category} />

		<ManagedBy {container} {relatedContainers} />

		<EditableOrganizationalUnit
			editable={editable && $ability.can('update', container.payload.type, 'organizational_unit')}
			organization={container.organization}
			bind:value={container.organizational_unit}
		/>
	{/snippet}

	{#snippet general()}
		{#if isSimpleMeasureContainer(container)}
			<EditableFile {editable} bind:value={container.payload.file} />
		{/if}

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
		<EditableCategory {editable} bind:value={container.payload.category} />

		<EditableTopic {editable} bind:value={container.payload.topic} />

		<EditablePolicyFieldBNK {editable} bind:value={container.payload.policyFieldBNK} />

		<EditableAudience {editable} bind:value={container.payload.audience} />
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
