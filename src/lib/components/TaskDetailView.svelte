<script lang="ts">
	import { _, date } from 'svelte-i18n';
	import LightBulb from '~icons/heroicons/light-bulb-16-solid';
	import { page } from '$app/stores';
	import fetchMembers from '$lib/client/fetchMembers';
	import paramsFromURL from '$lib/client/paramsFromURL';
	import ContainerDetailView from '$lib/components/ContainerDetailView.svelte';
	import Viewer from '$lib/components/Viewer.svelte';
	import {
		getCreator,
		isMeasureContainer,
		isMeasureResultContainer,
		isMilestoneContainer,
		overlayKey,
		owners,
		taskStatus
	} from '$lib/models';
	import type { AnyContainer, Container, TaskContainer, User } from '$lib/models';
	import { taskStatusColors, taskStatusIcons } from '$lib/theme/models';
	import { ability } from '$lib/stores';

	export let container: TaskContainer;
	export let relatedContainers: Container[];
	export let revisions: AnyContainer[];

	let organizationMembersRequest: Promise<User[]> = new Promise(() => []);

	$: organizationMembersRequest = fetchMembers(container.organization);

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

	$: measureResult = relatedContainers.find(isMeasureResultContainer);

	$: milestone = relatedContainers.find(isMilestoneContainer);

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
			<h3 class="meta-key">{$_('object')}</h3>
			<p class="meta-value">{$_(selectedRevision.payload.type)}</p>
		</div>
		{#if measure}
			<div class="meta">
				<h3 class="meta-key">{$_('measure')}</h3>
				<p class="meta-value">
					<a href={containerURL(measure.payload.type, measure.guid)}>
						{$_(measure.payload.title)}
					</a>
					{#if measureResult}
						/ <a href={containerURL(measureResult.payload.type, measureResult.guid)}>
							{$_(measureResult.payload.title)}
						</a>
					{/if}
					{#if milestone}
						/ <a href={containerURL(milestone.payload.type, milestone.guid)}>
							{$_(milestone.payload.title)}
						</a>
					{/if}
				</p>
			</div>
		{/if}
		<div class="meta">
			<h3 class="meta-key">{$_('status.label')}</h3>
			<p class="meta-value">
				<span class="badge badge--{taskStatusColors.get(selectedRevision.payload.taskStatus)}">
					<svelte:component
						this={taskStatusIcons.get(selectedRevision.payload.taskStatus) ?? LightBulb}
					/>
					{$_(selectedRevision.payload.taskStatus)}
				</span>
			</p>
		</div>
		<div class="meta">
			<h3 class="meta-key">{$_('owned_by')}</h3>
			<ul class="meta-value">
				{#each owners( container, [...$page.data.organizations, ...$page.data.organizationalUnits] ) as owner}
					<li>{owner.payload.name}</li>
				{/each}
			</ul>
		</div>
		{#if 'assignee' in selectedRevision.payload && selectedRevision.payload.assignee && $ability.can('read', selectedRevision, 'assignee')}
			{#await organizationMembersRequest then organizationMembers}
				<div class="meta">
					<h3 class="meta-key">{$_('assignee')}</h3>
					<p class="meta-value">
						{organizationMembers.find(({ guid }) => guid === selectedRevision.payload.assignee)
							?.display_name}
					</p>
				</div>
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
		{#await organizationMembersRequest then organizationMembers}
			{@const organizationMembersByGuid = new Map(organizationMembers.map((m) => [m.guid, m]))}
			<div class="meta">
				<h3 class="meta-key">{$_('created_date')}</h3>
				<ul class="meta-value">
					<li>
						{getCreator(revisions[0]).some((guid) => organizationMembersByGuid.has(guid))
							? $_('created_by', {
									values: {
										date: revisions[0].valid_from,
										creator: getCreator(revisions[0])
											.filter((guid) => organizationMembersByGuid.has(guid))
											.map((guid) => organizationMembersByGuid.get(guid)?.display_name)
											.join(', ')
									}
								})
							: $date(revisions[0].valid_from, { format: 'long' })}
					</li>
				</ul>
			</div>
			<div class="meta">
				<h3 class="meta-key">{$_('modified_date')}</h3>
				<ul class="meta-value">
					<li>
						{getCreator(selectedRevision).some((guid) => organizationMembersByGuid.has(guid))
							? $_('created_by', {
									values: {
										date: selectedRevision.valid_from,
										creator: getCreator(selectedRevision)
											.filter((guid) => organizationMembersByGuid.has(guid))
											.map((guid) => organizationMembersByGuid.get(guid)?.display_name)
											.join(', ')
									}
								})
							: $date(selectedRevision.valid_from, { format: 'long' })}
					</li>
				</ul>
			</div>
		{/await}
	</svelte:fragment>
</ContainerDetailView>
