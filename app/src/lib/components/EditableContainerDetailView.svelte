<script lang="ts">
	import type { Snippet } from 'svelte';
	import { _, date } from 'svelte-i18n';
	import AskAI from '~icons/knotdots/ask-ai';
	import { page } from '$app/state';
	import autoSave from '$lib/client/autoSave';
	import fetchMembers from '$lib/client/fetchMembers';
	import requestSubmit from '$lib/client/requestSubmit';
	import EditableProgress from '$lib/components/EditableProgress.svelte';
	import EditableVisibility from '$lib/components/EditableVisibility.svelte';
	import PropertyGrid from '$lib/components/PropertyGrid.svelte';
	import {
		type AnyContainer,
		type Container,
		displayName,
		getCreator,
		getManagedBy,
		isAdminOf,
		isContainerWithProgress,
		isContainerWithStatus,
		isHeadOf,
		isResolutionContainer,
		isSuggestedByAI,
		isTaskContainer,
		strategyTypes
	} from '$lib/models';
	import { ability, applicationState } from '$lib/stores';
	import {
		resolutionStatusColors,
		resolutionStatusIcons,
		statusColors,
		statusIcons,
		taskStatusColors,
		taskStatusIcons
	} from '$lib/theme/models';

	interface Props {
		container: Container;
		data?: Snippet;
		extra?: Snippet;
		relatedContainers: Container[];
		revisions: AnyContainer[];
	}

	let { container = $bindable(), data, extra, relatedContainers, revisions }: Props = $props();

	const handleSubmit = autoSave(container, 2000);

	let managedBy = $derived(
		getManagedBy(container, [
			...page.data.organizations,
			...page.data.organizationalUnits,
			...relatedContainers
		]) as AnyContainer
	);

	let managedByGuid = $derived(managedBy.guid);

	let teamPromise = $derived(fetchMembers(managedByGuid));

	let organization = $derived(container.organization);

	let organizationMembersPromise = $derived(fetchMembers(organization));
</script>

<form oninput={requestSubmit} onsubmit={handleSubmit} novalidate>
	<article class="details details-editable">
		<div class="details-tab" id="basic-data">
			{#if $applicationState.containerDetailView.editable}
				<h2
					class="details-title"
					contenteditable="plaintext-only"
					bind:textContent={container.payload.title}
					onkeydown={(e) => (e.key === 'Enter' ? e.preventDefault() : null)}
				></h2>
			{:else}
				<h2 class="details-title" contenteditable="false">
					{container.payload.title}
				</h2>
			{/if}

			<ul class="badges">
				<li class="badge badge--purple">
					{#if 'goalType' in container.payload && container.payload.goalType}
						{$_(container.payload.goalType)}
					{:else if 'strategyType' in container.payload && container.payload.strategyType !== strategyTypes.enum['strategy_type.misc']}
						{$_(container.payload.strategyType)}
					{:else}
						{$_(container.payload.type)}
					{/if}
				</li>
				{#if isSuggestedByAI(container)}
					<li class="badge badge--yellow"><AskAI />{$_('ai_suggestion')}</li>
				{/if}
				{#if isContainerWithStatus(container)}
					{@const StatusIcon = statusIcons.get(container.payload.status)}
					{#key container.payload.status}
						<li class="badge badge--{statusColors.get(container.payload.status)}">
							<StatusIcon />
							{$_(container.payload.status)}
						</li>
					{/key}
				{:else if isTaskContainer(container)}
					{@const TaskStatusIcon = taskStatusIcons.get(container.payload.taskStatus)}
					{#key container.payload.taskStatus}
						<li class="badge badge--{taskStatusColors.get(container.payload.taskStatus)}">
							<TaskStatusIcon />
							{$_(container.payload.taskStatus)}
						</li>
					{/key}
				{:else if isResolutionContainer(container)}
					{@const ResolutionStatusIcon = resolutionStatusIcons.get(
						container.payload.resolutionStatus
					)}
					{#key container.payload.resolutionStatus}
						<li
							class="badge badge--{resolutionStatusColors.get(container.payload.resolutionStatus)}"
						>
							<ResolutionStatusIcon />
							{$_(container.payload.resolutionStatus)}
						</li>
					{/key}
				{/if}
			</ul>

			{#if isContainerWithProgress(container)}
				<EditableProgress
					editable={$applicationState.containerDetailView.editable}
					bind:value={container.payload.progress}
					compact
				/>
			{/if}
		</div>

		<PropertyGrid>
			{#snippet top()}
				<div class="label">{$_('managed_by')}</div>
				<div class="value value--read-only">
					{#await teamPromise}
						&nbsp;
					{:then members}
						{@const headsOf = members
							.filter((m) => isHeadOf(m, managedBy))
							.map((m) => displayName(m))
							.join(', ')}
						{@const adminsOf = members
							.filter((m) => isAdminOf(m, managedBy))
							.map((m) => displayName(m))
							.join(', ')}
						{#if headsOf}{headsOf}{:else if adminsOf}{adminsOf}{:else}&nbsp;{/if}
					{/await}
				</div>

				<div class="label">{$_('created_date')}</div>
				<div class="value value--read-only">
					{#await organizationMembersPromise}
						{$date(revisions[0].valid_from, { format: 'long' })}
					{:then organizationMembers}
						{@const organizationMembersByGuid = new Map(
							organizationMembers.map((m) => [m.guid, m])
						)}
						{getCreator(revisions[0]).some((guid) => organizationMembersByGuid.has(guid))
							? $_('created_by', {
									values: {
										date: revisions[0].valid_from,
										creator: getCreator(revisions[0])
											.map((guid) => organizationMembersByGuid.get(guid))
											.filter((m) => m !== undefined)
											.map((m) => displayName(m))
											.join(', ')
									}
								})
							: $date(revisions[0].valid_from, { format: 'long' })}
					{/await}
				</div>

				<div class="label">{$_('modified_date')}</div>
				<div class="value value--read-only">
					{#await organizationMembersPromise}
						{$date(container.valid_from, { format: 'long' })}
					{:then organizationMembers}
						{@const organizationMembersByGuid = new Map(
							organizationMembers.map((m) => [m.guid, m])
						)}
						{getCreator(container).some((guid) => organizationMembersByGuid.has(guid))
							? $_('created_by', {
									values: {
										date: container.valid_from,
										creator: getCreator(container)
											.map((guid) => organizationMembersByGuid.get(guid))
											.filter((m) => m !== undefined)
											.map((m) => displayName(m))
											.join(', ')
									}
								})
							: $date(container.valid_from, { format: 'long' })}
					{/await}
				</div>

				{#if $ability.can('update', container, 'visibility')}
					<EditableVisibility
						editable={$applicationState.containerDetailView.editable}
						bind:value={container.payload.visibility}
					/>
				{/if}
			{/snippet}

			{#snippet bottom()}
				{@render data?.()}
			{/snippet}
		</PropertyGrid>

		{@render extra?.()}
	</article>
</form>

<style>
	.badges {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
		padding: 0.375rem 0 0.75rem;
	}
</style>
