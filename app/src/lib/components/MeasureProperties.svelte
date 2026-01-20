<script lang="ts">
	import { page } from '$app/state';
	import AuthoredBy from '$lib/components/AuthoredBy.svelte';
	import EditableAudience from '$lib/components/EditableAudience.svelte';
	import EditableCategory from '$lib/components/EditableCategory.svelte';
	import EditableDuration from '$lib/components/EditableDuration.svelte';
	import EditableEditorialState from '$lib/components/EditableEditorialState.svelte';
	import EditableMeasureHierarchyLevel from '$lib/components/EditableMeasureHierarchyLevel.svelte';
	import EditableMeasureType from '$lib/components/EditableMeasureType.svelte';
	import EditableOrganization from '$lib/components/EditableOrganization.svelte';
	import EditableOrganizationalUnit from '$lib/components/EditableOrganizationalUnit.svelte';
	import EditableParent from '$lib/components/EditableParent.svelte';
	import EditableProgram from '$lib/components/EditableProgram.svelte';
	import EditablePolicyFieldBNK from '$lib/components/EditablePolicyFieldBNK.svelte';
	import EditableStatus from '$lib/components/EditableStatus.svelte';
	import EditableTopic from '$lib/components/EditableTopic.svelte';
	import EditableVisibility from '$lib/components/EditableVisibility.svelte';
	import EditableCategories from '$lib/components/EditableCategories.svelte';
	import ManagedBy from '$lib/components/ManagedBy.svelte';
	import PropertyGrid from '$lib/components/PropertyGrid.svelte';
	import { createFeatureDecisions } from '$lib/features';
	import {
		type AnyContainer,
		type Container,
		type ContainerWithEffect,
		isMeasureContainer
	} from '$lib/models';
	import { ability } from '$lib/stores';

	interface Props {
		container: ContainerWithEffect;
		editable?: boolean;
		relatedContainers: Container[];
		revisions: AnyContainer[];
	}

	let { container = $bindable(), editable = false, relatedContainers, revisions }: Props = $props();

	const featureDecisions = createFeatureDecisions(page.data.features ?? []);
</script>

<PropertyGrid>
	{#snippet top()}
		<EditableMeasureType {editable} bind:value={container.payload.measureType} />

		{#if isMeasureContainer(container)}
			<EditableMeasureHierarchyLevel {editable} bind:value={container.payload.hierarchyLevel} />
		{/if}

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

		{#if isMeasureContainer(container)}
			<EditableMeasureHierarchyLevel {editable} bind:value={container.payload.hierarchyLevel} />
		{/if}

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
		{#if featureDecisions.useCustomCategories()}
			<EditableCategories bind:container {editable} organizationGuid={container.organization} />
		{:else}
			<EditableCategory {editable} bind:value={container.payload.category} />
			<EditableTopic {editable} bind:value={container.payload.topic} />
			<EditablePolicyFieldBNK {editable} bind:value={container.payload.policyFieldBNK} />
			<EditableAudience {editable} bind:value={container.payload.audience} />
		{/if}
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
