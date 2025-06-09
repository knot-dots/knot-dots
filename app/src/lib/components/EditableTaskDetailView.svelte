<script lang="ts">
	import { _ } from 'svelte-i18n';
	import fetchMembers from '$lib/client/fetchMembers';
	import EditableAssignee from '$lib/components/EditableAssignee.svelte';
	import EditableBenefit from '$lib/components/EditableBenefit.svelte';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableDate from '$lib/components/EditableDate.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import EditableMeasure from '$lib/components/EditableMeasure.svelte';
	import EditableOrganization from '$lib/components/EditableOrganization.svelte';
	import EditableOrganizationalUnit from '$lib/components/EditableOrganizationalUnit.svelte';
	import EditableParent from '$lib/components/EditableParent.svelte';
	import EditablePlainText from '$lib/components/EditablePlainText.svelte';
	import EditableTaskCategory from '$lib/components/EditableTaskCategory.svelte';
	import EditableTaskStatus from '$lib/components/EditableTaskStatus.svelte';
	import {
		type AnyContainer,
		type Container,
		isContainerWithEffect,
		isContainerWithObjective,
		type TaskContainer
	} from '$lib/models';
	import { ability, applicationState } from '$lib/stores';

	interface Props {
		container: TaskContainer;
		relatedContainers: Container[];
		revisions: AnyContainer[];
	}

	let { container = $bindable(), relatedContainers, revisions }: Props = $props();

	let managedBy = $derived(container.managed_by);

	let assigneeCandidatesPromise = $derived(fetchMembers(managedBy));

	let measure = $derived(relatedContainers.find(isContainerWithEffect));

	let goal = $derived(relatedContainers.find(isContainerWithObjective));
</script>

<EditableContainerDetailView bind:container {relatedContainers} {revisions}>
	{#snippet data()}
		<EditableTaskStatus
			editable={$applicationState.containerDetailView.editable}
			bind:value={container.payload.taskStatus}
		/>

		{#if $ability.can('read', container, 'assignee')}
			<EditableAssignee
				editable={$applicationState.containerDetailView.editable}
				candidatesPromise={assigneeCandidatesPromise}
				bind:value={container.payload.assignee}
			/>
		{/if}

		<EditableTaskCategory
			editable={$applicationState.containerDetailView.editable}
			bind:value={container.payload.taskCategory}
		/>

		<EditableDate
			editable={$applicationState.containerDetailView.editable}
			label={$_('fulfillment_date')}
			bind:value={container.payload.fulfillmentDate}
		/>

		<EditableBenefit
			editable={$applicationState.containerDetailView.editable}
			bind:value={container.payload.benefit}
		/>

		<EditablePlainText
			editable={$applicationState.containerDetailView.editable}
			label={$_('effort')}
			bind:value={container.payload.effort}
		/>

		<EditableMeasure editable={$applicationState.containerDetailView.editable} bind:container />

		<EditableParent editable={$applicationState.containerDetailView.editable} bind:container />

		<EditableOrganization
			editable={$applicationState.containerDetailView.editable &&
				$ability.can('update', container.payload.type, 'organization')}
			bind:value={container.organization}
		/>

		<EditableOrganizationalUnit
			editable={$applicationState.containerDetailView.editable &&
				$ability.can('update', container.payload.type, 'organizational_unit')}
			organization={container.organization}
			bind:value={container.organizational_unit}
		/>
	{/snippet}

	{#snippet extra()}
		{#key container.guid}
			<EditableFormattedText
				editable={$applicationState.containerDetailView.editable}
				label={$_('description')}
				bind:value={container.payload.description}
			/>
		{/key}
	{/snippet}
</EditableContainerDetailView>
