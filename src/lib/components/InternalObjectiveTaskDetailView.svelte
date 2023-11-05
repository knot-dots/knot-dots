<script lang="ts">
	import { onMount } from 'svelte';
	import { Icon, LightBulb } from 'svelte-hero-icons';
	import { _, date } from 'svelte-i18n';
	import { page } from '$app/stores';
	import fetchMembers from '$lib/client/fetchMembers';
	import paramsFromURL from '$lib/client/paramsFromURL';
	import InternalObjectiveDetailView from '$lib/components/InternalObjectiveDetailView.svelte';
	import Viewer from '$lib/components/Viewer.svelte';
	import { isMeasureContainer, owners, taskStatus } from '$lib/models';
	import type { AnyContainer, Container, TaskContainer, User } from '$lib/models';
	import { taskStatusColors, taskStatusIcons } from '$lib/theme/models';
	import { ability } from '$lib/stores';

	export let container: TaskContainer;
	export let relatedContainers: Container[];
	export let revisions: AnyContainer[];

	let membersPromise: Promise<User[]> = new Promise(() => []);

	onMount(() => {
		membersPromise = fetchMembers(
			$page.data.currentOrganizationalUnit?.guid ?? $page.data.currentOrganization.guid
		);
	});

	let selectedRevision: TaskContainer;

	$: {
		const parseResult = taskStatus.safeParse(paramsFromURL($page.url).get('task-status'));
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

	let isPage = $page.url.pathname == `/${container.payload.type}/${container.guid}`;

	function containerURL(type: string, guid: string) {
		if (isPage) {
			return `/${type}/${guid}`;
		} else {
			const query = paramsFromURL($page.url);
			query.set('view', guid);
			return `#${query.toString()}`;
		}
	}
</script>

<InternalObjectiveDetailView {container} {relatedContainers} {revisions}>
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
				</p>
			</div>
		{/if}
		<div class="meta">
			<h3 class="meta-key">{$_('status.label')}</h3>
			<p class="meta-value">
				<span class="badge badge--{taskStatusColors.get(selectedRevision.payload.taskStatus)}">
					<Icon
						src={taskStatusIcons.get(selectedRevision.payload.taskStatus) ?? LightBulb}
						size="16"
						mini
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
		{#if 'assignee' in container.payload && container.payload.assignee && $ability.can('read', container, 'assignee')}
			{#await membersPromise then members}
				<div class="meta">
					<h3 class="meta-key">{$_('assignee')}</h3>
					<p class="meta-value">
						{members.find(({ guid }) => guid === container.payload.assignee)?.display_name}
					</p>
				</div>
			{/await}
		{/if}
		{#if container.payload.taskCategory}
			<div class="meta">
				<h3 class="meta-key">{$_('task_category.label')}</h3>
				<p class="meta-value">
					<span class="badge">{$_(container.payload.taskCategory)}</span>
				</p>
			</div>
		{/if}
		{#if 'fulfillmentDate' in container.payload && container.payload.fulfillmentDate}
			<div class="meta">
				<h3 class="meta-key">{$_('fulfillment_date')}</h3>
				<p class="meta-value">
					{$date(new Date(container.payload.fulfillmentDate), { format: 'medium' })}
				</p>
			</div>
		{/if}
		<div class="meta">
			<h3 class="meta-key">{$_('created_date')}</h3>
			<ul class="meta-value">
				<li>{$date(revisions[0].valid_from, { format: 'medium' })}</li>
			</ul>
		</div>
		<div class="meta">
			<h3 class="meta-key">{$_('modified_date')}</h3>
			<ul class="meta-value">
				<li>{$date(selectedRevision.valid_from, { format: 'medium' })}</li>
			</ul>
		</div>
	</svelte:fragment>
</InternalObjectiveDetailView>
