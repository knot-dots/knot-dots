<script lang="ts">
	import { _, date } from 'svelte-i18n';
	import LightBulb from '~icons/heroicons/light-bulb-16-solid';
	import { page } from '$app/stores';
	import fetchMembers from '$lib/client/fetchMembers';
	import paramsFromURL from '$lib/client/paramsFromURL';
	import ContainerDetailView from '$lib/components/ContainerDetailView.svelte';
	import Viewer from '$lib/components/Viewer.svelte';
	import {
		displayName,
		isContainerWithObjective,
		isMeasureContainer,
		overlayKey,
		taskStatus
	} from '$lib/models';
	import type { AnyContainer, Container, TaskContainer, User } from '$lib/models';
	import { taskStatusColors, taskStatusIcons } from '$lib/theme/models';
	import { ability } from '$lib/stores';

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

	$: measure = isMeasureContainer(container)
		? container
		: relatedContainers.find(isMeasureContainer);

	$: goal = relatedContainers.find(isContainerWithObjective);

	let isPage = $page.url.pathname == `/${container.payload.type}/${container.guid}`;

	function containerURL(type: string, guid: string) {
		if (isPage) {
			return `/${type}/${guid}`;
		} else {
			const query = paramsFromURL($page.url);
			query.set(overlayKey.enum.view, guid);
			return `#${query.toString()}`;
		}
	}
</script>

<ContainerDetailView container={selectedRevision} {relatedContainers} {revisions}>
	<svelte:fragment slot="data">
		<div class="description">
			<h3>{$_('description')}</h3>
			<Viewer value={selectedRevision.payload.description} />
		</div>
	</svelte:fragment>

	<svelte:fragment slot="meta">
		<div class="meta">
			<h3 class="meta-key">{$_('status')}</h3>
			<p class="meta-value">
				<span class="badge badge--{taskStatusColors.get(selectedRevision.payload.taskStatus)}">
					<svelte:component
						this={taskStatusIcons.get(selectedRevision.payload.taskStatus) ?? LightBulb}
					/>
					{$_(selectedRevision.payload.taskStatus)}
				</span>
			</p>
		</div>

		{#if 'assignee' in selectedRevision.payload && selectedRevision.payload.assignee && $ability.can('read', selectedRevision, 'assignee')}
			{#await fetchMembers(container.managed_by) then members}
				{@const assignees = members.filter(({ guid }) =>
					selectedRevision.payload.assignee.includes(guid)
				)}
				{#if assignees.length > 0}
					<div class="meta">
						<h3 class="meta-key">{$_('assignee')}</h3>
						<p class="meta-value">{assignees.map((m) => displayName(m)).join(', ')}</p>
					</div>
				{/if}
			{/await}
		{/if}

		{#if selectedRevision.payload.taskCategory}
			<div class="meta">
				<h3 class="meta-key">{$_('task_category.label')}</h3>
				<p class="meta-value">
					<span class="badge">{$_(selectedRevision.payload.taskCategory)}</span>
				</p>
			</div>
		{/if}

		{#if 'fulfillmentDate' in selectedRevision.payload && selectedRevision.payload.fulfillmentDate}
			<div class="meta">
				<h3 class="meta-key">{$_('fulfillment_date')}</h3>
				<p class="meta-value">
					{$date(new Date(selectedRevision.payload.fulfillmentDate), { format: 'medium' })}
				</p>
			</div>
		{/if}

		{#if measure}
			<div class="meta">
				<h3 class="meta-key">{$_('measure')}</h3>
				<p class="meta-value">
					<a href={containerURL(measure.payload.type, measure.guid)}>
						{$_(measure.payload.title)}
					</a>
				</p>
			</div>
		{:else if goal}
			<div class="meta">
				<h3 class="meta-key">{$_('goal')}</h3>
				<p class="meta-value">
					<a href={containerURL(goal.payload.type, goal.guid)}>{goal.payload.title}</a>
				</p>
			</div>
		{/if}
	</svelte:fragment>
</ContainerDetailView>
