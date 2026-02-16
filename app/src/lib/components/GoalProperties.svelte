<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import AuthoredBy from '$lib/components/AuthoredBy.svelte';
	import EditableDate from '$lib/components/EditableDate.svelte';
	import EditableEditorialState from '$lib/components/EditableEditorialState.svelte';
	import EditableGoalHierarchyLevel from '$lib/components/EditableGoalHierarchyLevel.svelte';
	import EditableGoalStatus from '$lib/components/EditableGoalStatus.svelte';
	import EditableGoalType from '$lib/components/EditableGoalType.svelte';
	import EditableMeasure from '$lib/components/EditableMeasure.svelte';
	import EditableOrganization from '$lib/components/EditableOrganization.svelte';
	import EditableOrganizationalUnit from '$lib/components/EditableOrganizationalUnit.svelte';
	import EditableParent from '$lib/components/EditableParent.svelte';
	import EditableProgram from '$lib/components/EditableProgram.svelte';
	import EditableCategory from '$lib/components/EditableCategory.svelte';
	import EditableTopic from '$lib/components/EditableTopic.svelte';
	import EditablePolicyFieldBNK from '$lib/components/EditablePolicyFieldBNK.svelte';
	import EditableAudience from '$lib/components/EditableAudience.svelte';
	import EditableCategories from '$lib/components/EditableCategories.svelte';
	import EditableVisibility from '$lib/components/EditableVisibility.svelte';
	import ManagedBy from '$lib/components/ManagedBy.svelte';
	import PropertyGrid from '$lib/components/PropertyGrid.svelte';
	import { createFeatureDecisions } from '$lib/features';
	import { type AnyContainer, type Container, type GoalContainer, predicates } from '$lib/models';
	import { ability } from '$lib/stores';

	interface Props {
		container: GoalContainer;
		editable?: boolean;
		relatedContainers: Container[];
		revisions: AnyContainer[];
	}

	let { container = $bindable(), editable = false, relatedContainers, revisions }: Props = $props();

	const featureDecisions = createFeatureDecisions(page.data.features ?? []);

	let isPartOfMeasure = $derived(
		container.relation.some(({ predicate }) => predicate == predicates.enum['is-part-of-measure'])
	);
</script>

<PropertyGrid>
	{#snippet top()}
		<EditableGoalType {editable} bind:value={container.payload.goalType} />

		<EditableGoalHierarchyLevel {editable} bind:value={container.payload.hierarchyLevel} />

		<EditableDate
			{editable}
			label={$_('fulfillment_date')}
			bind:value={container.payload.fulfillmentDate}
		/>

		{#if isPartOfMeasure}
			<EditableMeasure bind:container {editable} />
		{:else}
			<EditableProgram bind:container {editable} />
		{/if}

		<EditableOrganizationalUnit
			editable={editable && $ability.can('update', container.payload.type, 'organizational_unit')}
			organization={container.organization}
			bind:value={container.organizational_unit}
		/>
	{/snippet}

	{#snippet general()}
		<EditableGoalType {editable} bind:value={container.payload.goalType} />

		<EditableGoalStatus {editable} bind:value={container.payload.goalStatus} />

		<EditableGoalHierarchyLevel {editable} bind:value={container.payload.hierarchyLevel} />

		{#if $ability.can('read', container, 'payload.editorialState')}
			<EditableEditorialState
				editable={editable && $ability.can('update', container, 'payload.editorialState')}
				bind:value={container.payload.editorialState}
			/>
		{/if}

		<EditableDate
			{editable}
			label={$_('fulfillment_date')}
			bind:value={container.payload.fulfillmentDate}
		/>

		{#if isPartOfMeasure}
			<EditableMeasure bind:container {editable} />
		{:else}
			<EditableProgram bind:container {editable} />
		{/if}

		<EditableParent bind:container {editable} />

		{#if $ability.can('update', container, 'visibility')}
			<EditableVisibility {editable} bind:value={container.payload.visibility} />
		{/if}
	{/snippet}

	{#snippet categories()}
		{#if featureDecisions.useCustomCategories()}
			<EditableCategories bind:container {editable} organizationGuid={container.organization} />
		{:else}
			<EditableCategory {editable} bind:value={container.payload.sdg} />
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
