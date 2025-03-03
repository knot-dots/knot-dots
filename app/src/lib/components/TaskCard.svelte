<script lang="ts">
	import { _, date } from 'svelte-i18n';
	import CalendarDays from '~icons/heroicons/calendar-days-16-solid';
	import ExclamationCircle from '~icons/heroicons/exclamation-circle-16-solid';
	import Card from '$lib/components/Card.svelte';
	import { type Container, type TaskContainer, taskStatus } from '$lib/models';
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
						<ExclamationCircle />
						{$_('days_ago', {
							values: { daysAgo: calculateDaysFromNow(container.payload.fulfillmentDate) }
						})}
					</time>
				{/if}

				<time class="badge badge--yellow" datetime={container.payload.fulfillmentDate}>
					<CalendarDays />
					{$date(new Date(container.payload.fulfillmentDate), {
						year: 'numeric',
						month: '2-digit',
						day: '2-digit'
					})}
				</time>
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
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
</style>
