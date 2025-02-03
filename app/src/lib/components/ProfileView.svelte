<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Card from '$lib/components/Card.svelte';
	import OrganizationCard from '$lib/components/OrganizationCard.svelte';
	import SortDropdown from '$lib/components/SortDropdown.svelte';
	import TaskCard from '$lib/components/TaskCard.svelte';
	import TaskStatusFilterDropdown from '$lib/components/TaskStatusFilterDropdown.svelte';
	import {
		type AnyContainer,
		type ContainerWithEffect,
		isAssignedTo,
		isContainerWithEffect,
		isMemberOf,
		isOrganizationalUnitContainer,
		isOrganizationContainer,
		isStrategyContainer,
		isTaskContainer,
		type OrganizationalUnitContainer,
		type OrganizationContainer,
		type TaskContainer,
		type TaskStatus,
		taskStatus
	} from '$lib/models';
	import { user } from '$lib/stores';

	interface Props {
		containers: AnyContainer[];
	}

	let { containers } = $props();

	let taskStatusFilter: TaskStatus[] = $state([
		taskStatus.enum['task_status.in_planning'],
		taskStatus.enum['task_status.in_progress']
	]);

	function byTaskStatus(value: TaskStatus[]) {
		return (container: TaskContainer) =>
			value.length == 0 || value.includes(container.payload.taskStatus);
	}

	const sortOptions = [
		{ value: 'fulfillment_date', label: $_('sort_fulfillment_date') },
		{ value: 'modified', label: $_('sort_modified') },
		{ value: 'alpha', label: $_('sort_alphabetically') }
	];

	let sort = $state('fulfillment_date');

	function bySortOption(value: string) {
		switch (value) {
			case 'fulfillment_date':
				return (a: TaskContainer, b: TaskContainer) => {
					if (a.payload.fulfillmentDate && b.payload.fulfillmentDate) {
						return (
							new Date(a.payload.fulfillmentDate).getTime() -
							new Date(b.payload.fulfillmentDate).getTime()
						);
					} else if (a.payload.fulfillmentDate) {
						return 1;
					} else if (b.payload.fulfillmentDate) {
						return -1;
					} else {
						return 0;
					}
				};

			case 'modified':
				return (a: TaskContainer, b: TaskContainer) => a.valid_from < b.valid_from;
			case 'alpha':
				return (a: TaskContainer, b: TaskContainer) => a.payload.title > b.payload.title;
		}
	}
</script>

<article class="details">
	<div class="tasks">
		<h2>{$_('profile.my_tasks')}</h2>

		<div class="carousel-toolbar">
			<SortDropdown options={sortOptions} bind:value={sort} />
			<span class="divider"></span>
			<TaskStatusFilterDropdown bind:value={taskStatusFilter} />
		</div>

		<ul class="carousel">
			{#each containers
				.filter(isTaskContainer)
				.filter(isAssignedTo($user))
				.filter(byTaskStatus(taskStatusFilter))
				.toSorted(bySortOption(sort)) as task}
				<li>
					<TaskCard container={task} showTaskStatusBadge />
				</li>
			{/each}
		</ul>
	</div>

	<div class="measures">
		<h2>{$_('profile.my_measures')}</h2>
		<ul class="carousel">
			{#each containers
				.filter(isContainerWithEffect)
				.filter((c: ContainerWithEffect) => isMemberOf($user, c)) as measure}
				<li>
					<Card container={measure} />
				</li>
			{/each}
		</ul>
	</div>

	<div class="organizations">
		<h2>{$_('profile.my_organizations')}</h2>
		<ul class="carousel">
			{#each containers
				.filter((c: AnyContainer) => isOrganizationContainer(c) || isOrganizationalUnitContainer(c))
				.filter( (c: OrganizationContainer | OrganizationalUnitContainer) => isMemberOf($user, c) ) as organization}
				<li>
					<OrganizationCard container={organization} />
				</li>
			{/each}
		</ul>
	</div>

	<div class="strategies">
		<h2>{$_('profile.my_strategies')}</h2>
		<ul class="carousel">
			{#each containers.filter(isStrategyContainer) as strategy}
				<li>
					<Card container={strategy} />
				</li>
			{/each}
		</ul>
	</div>
</article>

<style>
	h2 {
		color: var(--color-gray-700);
		font-weight: 600;
		line-height: 1.25;
		margin-bottom: 0.5rem;
	}

	.divider {
		border-left: solid 2px var(--color-gray-200);
		margin: 0 0.125rem;
	}
</style>
