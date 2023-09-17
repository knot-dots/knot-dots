<script lang="ts">
	import { Icon, LightBulb } from 'svelte-hero-icons';
	import { _, date, number } from 'svelte-i18n';
	import { page } from '$app/stores';
	import ContainerDetailView from '$lib/components/ContainerDetailView.svelte';
	import Viewer from '$lib/components/Viewer.svelte';
	import {
		isOperationalGoalContainer,
		isStrategyContainer,
		owners,
		sdgIcons,
		status,
		statusColors,
		statusIcons
	} from '$lib/models';
	import type { AnyContainer, Container, MeasureContainer, Status } from '$lib/models';

	export let container: MeasureContainer;
	export let relatedContainers: Container[];
	export let revisions: AnyContainer[];

	let selectedRevision: MeasureContainer;

	$: {
		const parseResult = status.safeParse($page.url.searchParams.get('status'));
		if (parseResult.success) {
			selectedRevision =
				(revisions as MeasureContainer[]).findLast(
					({ payload }) => payload.status == parseResult.data
				) ?? container;
		} else {
			selectedRevision = container;
		}
	}

	$: strategy = relatedContainers.find(isStrategyContainer);

	function tabURL(params: URLSearchParams, status: Status) {
		const query = new URLSearchParams(params);
		query.set('status', status);
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

<ContainerDetailView {container} {relatedContainers} {revisions}>
	<slot slot="header">
		<slot name="header" />
		<ul class="tabs">
			{#each status.options as statusOption}
				<li
					class="tab-item"
					class:tab-item--active={statusOption === selectedRevision.payload.status}
				>
					{#if status.options.findIndex((o) => statusOption === o) <= status.options.findIndex((o) => container.payload.status === o)}
						<a
							class="badge badge--{statusColors.get(statusOption)}"
							href={tabURL($page.url.searchParams, statusOption)}
						>
							<Icon src={statusIcons.get(statusOption) ?? LightBulb} size="16" mini />
							{$_(statusOption)}
						</a>
					{:else}
						<span class="badge badge--{statusColors.get(statusOption)}">
							<Icon src={statusIcons.get(statusOption) ?? LightBulb} size="16" mini />
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
			<h3>{$_('measure.description')}</h3>
			<Viewer value={selectedRevision.payload.description} />
		</div>
		<div class="resource">
			<h3>{$_('resources.label')}</h3>
			<ul>
				{#each selectedRevision.payload.resource as resource}
					<li class="resource-item">
						<span>{resource.description}</span>
						<span>{resource.unit}</span>
						<span>{$number(resource.amount)}</span>
						<span>
							{$date(new Date(resource.fulfillmentDate), {
								day: '2-digit',
								month: '2-digit',
								year: 'numeric'
							})}
						</span>
					</li>
				{/each}
			</ul>
		</div>
		{#if 'indicatorContribution' in selectedRevision.payload}
			<div class="indicatorContribution">
				<h3>{$_('effects')}</h3>
				{#each relatedContainers.filter(isOperationalGoalContainer) as { guid, payload }}
					{#if 'indicator' in payload && payload.indicator.length > 0 && 'quantity' in payload.indicator[0]}
						<h4>
							<a href={containerURL(payload.type, guid)}>{payload.title}</a>
						</h4>
						<p>
							{$_(`${payload.indicator[0].quantity}.description`, {
								values: {
									contribution: selectedRevision.payload.indicatorContribution?.[guid] ?? 0
								}
							})}
						</p>
					{/if}
				{/each}
			</div>
		{/if}
		{#if selectedRevision.payload.status === status.enum['status.in_planning']}
			<div class="annotation">
				<h3>{$_('annotation')}</h3>
				<Viewer value={selectedRevision.payload.annotation} />
			</div>
		{:else if selectedRevision.payload.status === status.enum['status.in_implementation']}
			<div class="comment">
				<h3>{$_('comment')}</h3>
				<Viewer value={selectedRevision.payload.comment} />
			</div>
		{:else if selectedRevision.payload.status === status.enum['status.in_operation'] || selectedRevision.payload.status === status.enum['status.done']}
			<div class="result">
				<h3>{$_('result')}</h3>
				<Viewer value={selectedRevision.payload.result} />
			</div>
		{/if}
	</svelte:fragment>

	<svelte:fragment slot="meta">
		<div class="meta">
			<h3 class="meta-key">{$_('object')}</h3>
			<p class="meta-value">{$_(selectedRevision.payload.type)}</p>
		</div>
		{#if strategy}
			<div class="meta">
				<h3 class="meta-key">{$_('strategy')}</h3>
				<p class="meta-value">
					{#if $page.url.pathname === `/strategy/${strategy.guid}`}
						{$_(strategy.payload.title)}
					{:else}
						<a href={containerURL(strategy.payload.type, strategy.guid)}>
							{$_(strategy.payload.title)}
						</a>
					{/if}
				</p>
			</div>
			<div class="meta">
				<h3 class="meta-key">{$_('strategy_type.label')}</h3>
				<p class="meta-value">{$_(strategy.payload.strategyType)}</p>
			</div>
		{/if}
		<div class="meta">
			<h3 class="meta-key">{$_('topic.label')}</h3>
			<ul class="meta-value meta-value--topic">
				{#each selectedRevision.payload.topic as topic}
					<li>{$_(topic)}</li>
				{/each}
			</ul>
		</div>
		<div class="meta">
			<h3 class="meta-key">{$_('category')}</h3>
			<ul class="meta-value meta-value--category">
				{#each selectedRevision.payload.category as category}
					<li>
						<img
							src={sdgIcons.get(category)}
							alt={$_(category)}
							title={$_(category)}
							width="66"
							height="66"
						/>
					</li>
				{/each}
			</ul>
		</div>
		<div class="meta">
			<h3 class="meta-key">{$_('status.label')}</h3>
			<p class="meta-value">
				<span class="badge badge--{statusColors.get(selectedRevision.payload.status)}">
					<Icon
						src={statusIcons.get(selectedRevision.payload.status) ?? LightBulb}
						size="16"
						mini
					/>
					{$_(selectedRevision.payload.status)}
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
		<div class="meta">
			<h3 class="meta-key">{$_('planned_duration')}</h3>
			<p class="meta-value">
				{#if selectedRevision.payload.startDate && selectedRevision.payload.endDate}
					{$date(new Date(selectedRevision.payload.startDate), { format: 'short' })}–{$date(
						new Date(selectedRevision.payload.endDate),
						{
							format: 'short'
						}
					)}
				{:else if selectedRevision.payload.startDate}
					{$date(new Date(selectedRevision.payload.startDate), { format: 'short' })}–
				{/if}
			</p>
		</div>
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
</ContainerDetailView>

<style>
	.resource-item {
		border-bottom: solid 1px var(--color-gray-300);
		column-gap: 1rem;
		display: flex;
		flex-wrap: wrap;
		margin-bottom: 0.5rem;
		padding-bottom: 0.5rem;
	}

	.resource-item > * {
		flex: 0 1 0;
	}

	.resource-item > :nth-child(1) {
		flex: 1 0 100%;
	}

	.resource-item > :nth-child(3) {
		text-align: right;
	}

	.tabs > .tab-item {
		opacity: 0.3;
	}

	.tabs > .tab-item--active {
		opacity: 1;
	}
</style>
