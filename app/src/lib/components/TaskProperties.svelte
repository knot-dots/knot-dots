<script lang="ts">
	import { _ } from 'svelte-i18n';
	import fetchMembers from '$lib/client/fetchMembers';
	import AuthoredBy from '$lib/components/AuthoredBy.svelte';
	import EditableAssignee from '$lib/components/EditableAssignee.svelte';
	import EditableBenefit from '$lib/components/EditableBenefit.svelte';
	import EditableDate from '$lib/components/EditableDate.svelte';
	import EditableMeasure from '$lib/components/EditableMeasure.svelte';
	import EditableOrganization from '$lib/components/EditableOrganization.svelte';
	import EditableOrganizationalUnit from '$lib/components/EditableOrganizationalUnit.svelte';
	import EditableParent from '$lib/components/EditableParent.svelte';
	import EditablePlainText from '$lib/components/EditablePlainText.svelte';
	import EditableTaskCategory from '$lib/components/EditableTaskCategory.svelte';
	import EditableTaskStatus from '$lib/components/EditableTaskStatus.svelte';
	import EditableVisibility from '$lib/components/EditableVisibility.svelte';
	import ManagedBy from '$lib/components/ManagedBy.svelte';
	import PropertyGrid from '$lib/components/PropertyGrid.svelte';
	import { type AnyContainer, type Container, type TaskContainer } from '$lib/models';
	import { ability } from '$lib/stores';

	interface Props {
		container: TaskContainer;
		editable?: boolean;
		relatedContainers: Container[];
		revisions: AnyContainer[];
	}

	let { container = $bindable(), editable = false, relatedContainers, revisions }: Props = $props();

	let managedBy = $derived(container.managed_by);

	let assigneeCandidatesPromise = $derived(fetchMembers(managedBy));
</script>

<PropertyGrid>
	{#snippet top()}
		<EditableTaskCategory {editable} bind:value={container.payload.taskCategory} />

		<EditableDate
			{editable}
			label={$_('fulfillment_date')}
			bind:value={container.payload.fulfillmentDate}
		/>

		{#if $ability.can('read', container, 'assignee')}
			<EditableAssignee
				{editable}
				candidatesPromise={assigneeCandidatesPromise}
				bind:value={container.payload.assignee}
			/>
		{/if}

		<AuthoredBy {container} {revisions} />
	{/snippet}

	{#snippet bottom()}
		<EditableTaskCategory {editable} bind:value={container.payload.taskCategory} />

		<EditableBenefit {editable} bind:value={container.payload.benefit} />

		<EditablePlainText {editable} label={$_('effort')} bind:value={container.payload.effort} />

		<EditableTaskStatus {editable} bind:value={container.payload.taskStatus} />

		<EditableDate
			{editable}
			label={$_('fulfillment_date')}
			bind:value={container.payload.fulfillmentDate}
		/>

		{#if $ability.can('read', container, 'assignee')}
			<EditableAssignee
				{editable}
				candidatesPromise={assigneeCandidatesPromise}
				bind:value={container.payload.assignee}
			/>
		{/if}

		<EditableMeasure {editable} bind:container />

		<EditableParent {editable} bind:container />

		{#if $ability.can('update', container, 'visibility')}
			<EditableVisibility {editable} bind:value={container.payload.visibility} />
		{/if}

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
