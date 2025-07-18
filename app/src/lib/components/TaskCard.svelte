<script lang="ts">
	import { _, date } from 'svelte-i18n';
	import Card from '$lib/components/Card.svelte';
	import fetchMembers from '$lib/client/fetchMembers';
	import { type Container, type TaskContainer, displayName } from '$lib/models';
	import { taskStatusIcons, taskStatusColors } from '$lib/theme/models';

	interface Props {
		container: TaskContainer;
		relatedContainers?: Container[];
		showRelationFilter?: boolean;
		showTaskStatusBadge?: boolean;
	}

	const {
		container,
		relatedContainers = [],
		showRelationFilter = false,
		showTaskStatusBadge = false
	}: Props = $props();

	let organization = $derived(container.organization);
	let organizationMembersPromise = $derived(fetchMembers(organization));

	function calculateDaysFromNow(dateString: string): number {
		const givenDate = new Date(dateString);
		const today = new Date();

		const givenDateUTC = Date.UTC(
			givenDate.getFullYear(),
			givenDate.getMonth(),
			givenDate.getDate()
		);
		const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());

		const diffInMs = todayUTC - givenDateUTC;
		return Math.floor(diffInMs / (1000 * 60 * 60 * 24));
	}

	function isPending(container: TaskContainer): boolean {
		return (
			container.payload.taskStatus === 'task_status.idea' ||
			container.payload.taskStatus === 'task_status.in_planning' ||
			container.payload.taskStatus === 'task_status.in_progress'
		);
	}
</script>

<Card {container} {relatedContainers} {showRelationFilter}>
	{#snippet footer()}
		{@const StatusIcon = taskStatusIcons.get(container.payload.taskStatus)}

		<div class="badges">
			{#if container.payload.fulfillmentDate}
				{#if isPending(container) && calculateDaysFromNow(container.payload.fulfillmentDate) > 0}
					<time class="badge badge--red" datetime={container.payload.fulfillmentDate}>
						{$_('days_ago', {
							values: { daysAgo: calculateDaysFromNow(container.payload.fulfillmentDate) }
						})}
					</time>
				{/if}

				<time class="badge badge--yellow" datetime={container.payload.fulfillmentDate}>
					{$date(new Date(container.payload.fulfillmentDate), {
						year: 'numeric',
						month: '2-digit',
						day: '2-digit'
					})}
				</time>
			{/if}

			{#if container.payload.assignee && container.payload.assignee.length > 0}
				{#await organizationMembersPromise}
					<span class="badge badge--assignee">
						{container.payload.assignee.length} assignee{container.payload.assignee.length > 1 ? 's' : ''}
					</span>
				{:then organizationMembers}
					{@const organizationMembersByGuid = new Map(organizationMembers.map((m) => [m.guid, m]))}
					{#each container.payload.assignee as assigneeGuid}
						{@const assigneeUser = organizationMembersByGuid.get(assigneeGuid)}
						{#if assigneeUser}
							<span class="badge badge--assignee">
								{displayName(assigneeUser)}
							</span>
						{/if}
					{/each}
				{/await}
			{/if}

			{#if showTaskStatusBadge}
				<span class="status-icon badge badge--{taskStatusColors.get(container.payload.taskStatus)}">
					<StatusIcon />
					{$_(container.payload.taskStatus)}
				</span>
			{/if}
		</div>
	{/snippet}
</Card>

<style>
	.badges {
		--spacing-2: 8px;
		--spacing-0-5: 2px;
		
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: var(--spacing-2);
	}
	
	.badge {
		--text-sm-size: 14px;
		--font-medium: 500;
		--rounded-md: 6px;
		--spacing-0-5: 2px;
		--spacing-1: 4px;
		
		display: inline-flex;
		align-items: center;
		gap: var(--spacing-1);
		font-size: var(--text-sm-size);
		font-weight: var(--font-medium);
		border-radius: var(--rounded-md);
		padding: var(--spacing-0-5) var(--spacing-1);
		line-height: 1.5;
		color: var(--color-gray-900);
		background-color: transparent;
	}
	
	.badge--yellow {
		color: var(--color-gray-900);
		background-color: transparent;
	}
	
	.badge--red {
		color: var(--color-gray-900);
		background-color: transparent;
	}
	
	.badge--assignee {
		--badge-bg: var(--color-gray-100);
		--badge-color: var(--color-gray-900);
		--spacing-2-5: 10px;
		
		background-color: var(--badge-bg);
		color: var(--badge-color);
		padding: var(--spacing-0-5) var(--spacing-2-5);
	}
	
	.badge :global(svg) {
		height: 16px;
		width: 16px;
		flex-shrink: 0;
	}
</style>
