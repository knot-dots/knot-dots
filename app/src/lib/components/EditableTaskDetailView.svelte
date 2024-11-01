<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import fetchMembers from '$lib/client/fetchMembers';
	import paramsFromURL from '$lib/client/paramsFromURL';
	import EditableAssignee from '$lib/components/EditableAssignee.svelte';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableDate from '$lib/components/EditableDate.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import EditableMeasure from '$lib/components/EditableMeasure.svelte';
	import EditableOwnedBy from '$lib/components/EditableOwnedBy.svelte';
	import EditableParent from '$lib/components/EditableParent.svelte';
	import EditableTaskCategory from '$lib/components/EditableTaskCategory.svelte';
	import EditableTaskStatus from '$lib/components/EditableTaskStatus.svelte';
	import {
		type AnyContainer,
		type Container,
		isContainerWithEffect,
		isContainerWithObjective,
		isMeasureResultContainer,
		isMilestoneContainer,
		type TaskContainer,
		taskStatus
	} from '$lib/models';
	import { ability, applicationState } from '$lib/stores';

	export let container: TaskContainer;
	export let relatedContainers: Container[];
	export let revisions: AnyContainer[];

	let selectedRevision: TaskContainer;

	$: {
		const parseResult = taskStatus.safeParse(paramsFromURL($page.url).get('taskStatus'));
		if (parseResult.success) {
			selectedRevision =
				(revisions as TaskContainer[]).findLast(
					({ payload }) => payload.taskStatus == parseResult.data
				) ?? container;
		} else {
			selectedRevision = container;
		}
	}

	$: managedBy = container.managed_by;

	$: assigneeCandidatesPromise = fetchMembers(managedBy);

	$: measure = relatedContainers.find(isContainerWithEffect);

	$: measureResult = relatedContainers.find(isMeasureResultContainer);

	$: milestone = relatedContainers.find(isMilestoneContainer);

	$: goal = relatedContainers.find(isContainerWithObjective);
</script>

<EditableContainerDetailView container={selectedRevision} {relatedContainers} {revisions}>
	<svelte:fragment slot="data">
		<EditableFormattedText
			editable={$applicationState.containerDetailView.editable}
			label={$_('description')}
			bind:value={selectedRevision.payload.description}
		/>

		<EditableTaskStatus
			editable={$applicationState.containerDetailView.editable}
			bind:value={selectedRevision.payload.taskStatus}
		/>

		{#if $ability.can('read', selectedRevision, 'assignee')}
			<EditableAssignee
				editable={$applicationState.containerDetailView.editable}
				candidatesPromise={assigneeCandidatesPromise}
				bind:value={selectedRevision.payload.assignee}
			/>
		{/if}

		<EditableTaskCategory
			editable={$applicationState.containerDetailView.editable}
			bind:value={selectedRevision.payload.taskCategory}
		/>

		<EditableDate
			editable={$applicationState.containerDetailView.editable}
			label={$_('fulfillment_date')}
			bind:value={container.payload.fulfillmentDate}
		/>

		<EditableMeasure editable={$applicationState.containerDetailView.editable} bind:container />

		<EditableParent editable={$applicationState.containerDetailView.editable} bind:container />

		<EditableOwnedBy editable={$applicationState.containerDetailView.editable} bind:container />
	</svelte:fragment>
</EditableContainerDetailView>
