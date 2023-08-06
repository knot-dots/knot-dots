<script lang="ts">
	import { Icon, LightBulb } from 'svelte-hero-icons';
	import { _, date } from 'svelte-i18n';
	import { page } from '$app/stores';
	import InternalObjectiveDetailView from './InternalObjectiveDetailView.svelte';
	import Viewer from '$lib/components/Viewer.svelte';
	import { isMeasureContainer, taskStatus, taskStatusColors, taskStatusIcons } from '$lib/models';
	import type { AnyContainer, Container, TaskContainer, TaskStatus } from '$lib/models';

	export let container: TaskContainer;
	export let relatedContainers: Container[];
	export let revisions: AnyContainer[];

	let selectedRevision: TaskContainer;

	$: {
		const parseResult = taskStatus.safeParse($page.url.searchParams.get('task-status'));
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

	function tabURL(params: URLSearchParams, status: TaskStatus) {
		const query = new URLSearchParams(params);
		query.set('task-status', status);
		return `?${query.toString()}`;
	}

	let isPage = $page.url.pathname == `/${container.payload.type}/${container.guid}`;

	function containerURL(type: string, guid: string) {
		if (isPage) {
			return `/${type}/${guid}`;
		} else {
			const query = new URLSearchParams($page.url.searchParams);
			query.set('container-preview', guid);
			return `?${query.toString()}`;
		}
	}
</script>

<InternalObjectiveDetailView {container} {relatedContainers} {revisions}>
	<slot slot="header">
		<slot name="header" />
		<ul class="tabs">
			{#each taskStatus.options as statusOption}
				<li
					class="tab-item"
					class:tab-item--active={statusOption === selectedRevision.payload.taskStatus}
				>
					{#if taskStatus.options.findIndex((o) => statusOption === o) <= taskStatus.options.findIndex((o) => container.payload.taskStatus === o)}
						<a
							class="badge badge--{taskStatusColors.get(statusOption)}"
							href={tabURL($page.url.searchParams, statusOption)}
						>
							<Icon src={taskStatusIcons.get(statusOption) ?? LightBulb} size="16" mini />
							{$_(statusOption)}
						</a>
					{:else}
						<span class="badge badge--{taskStatusColors.get(statusOption)}">
							<Icon src={taskStatusIcons.get(statusOption) ?? LightBulb} size="16" mini />
							{$_(statusOption)}
						</span>
					{/if}
				</li>
			{/each}
		</ul>
	</slot>

	<svelte:fragment slot="data">
		<div class="summary">
			<h3>{$_('measure.summary')}</h3>
			{selectedRevision.payload.summary ?? ''}
		</div>
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

<style>
	.tabs > .tab-item {
		opacity: 0.3;
	}

	.tabs > .tab-item--active {
		opacity: 1;
	}
</style>
