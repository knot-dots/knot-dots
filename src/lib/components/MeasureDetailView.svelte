<script lang="ts">
	import { onMount } from 'svelte';
	import { Icon, LightBulb } from 'svelte-hero-icons';
	import { _, date, number } from 'svelte-i18n';
	import { page } from '$app/stores';
	import fetchContainers from '$lib/client/fetchContainers';
	import paramsFromURL from '$lib/client/paramsFromURL';
	import IndicatorChart from '$lib/components/IndicatorChart.svelte';
	import Viewer from '$lib/components/Viewer.svelte';
	import { isStrategyContainer, owners, payloadTypes, status } from '$lib/models';
	import type { AnyContainer, Container, IndicatorContainer, MeasureContainer } from '$lib/models';
	import { sdgIcons, statusColors, statusIcons } from '$lib/theme/models';
	import { applicationState } from '$lib/stores';

	export let container: MeasureContainer;
	export let relatedContainers: Container[];
	export let revisions: AnyContainer[];

	applicationState.update((state) => ({
		...state,
		containerDetailView: { activeTab: 'basic-data', tabs: ['basic-data', 'resources', 'effects'] }
	}));

	let selectedRevision: MeasureContainer;

	$: {
		const parseResult = status.safeParse(paramsFromURL($page.url).get('status'));
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

	let indicatorsRequest: Promise<IndicatorContainer[]> = new Promise(() => []);

	onMount(() => {
		if (container.payload.effect.length > 0) {
			indicatorsRequest = fetchContainers({
				organization: [container.organization],
				payloadType: [payloadTypes.enum.indicator]
			}) as Promise<IndicatorContainer[]>;
		}
	});
</script>

<article class="details">
	{#if $applicationState.containerDetailView.activeTab === 'basic-data'}
		<div class="details-tab" id="basic-data">
			{#if 'summary' in container.payload}
				<div class="summary">
					<h3>{$_('measure.summary')}</h3>
					{selectedRevision.payload.summary ?? ''}
				</div>
			{/if}

			{#if 'description' in container.payload}
				<div class="description">
					<h3>{$_('measure.description')}</h3>
					<Viewer value={selectedRevision.payload.description} />
				</div>
			{/if}

			{#if 'annotation' in container.payload && selectedRevision.payload.status === status.enum['status.in_planning']}
				<div class="annotation">
					<h3>{$_('annotation')}</h3>
					<Viewer value={selectedRevision.payload.annotation} />
				</div>
			{:else if 'comment' in container.payload && selectedRevision.payload.status === status.enum['status.in_implementation']}
				<div class="comment">
					<h3>{$_('comment')}</h3>
					<Viewer value={selectedRevision.payload.comment} />
				</div>
			{:else if ('result' in container.payload && selectedRevision.payload.status === status.enum['status.in_operation']) || selectedRevision.payload.status === status.enum['status.done']}
				<div class="result">
					<h3>{$_('result')}</h3>
					<Viewer value={selectedRevision.payload.result} />
				</div>
			{/if}

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

			{#if 'topic' in container.payload}
				<div class="meta">
					<h3 class="meta-key">{$_('topic.label')}</h3>
					<ul class="meta-value meta-value--topic">
						{#each selectedRevision.payload.topic as topic}
							<li>{$_(topic)}</li>
						{/each}
					</ul>
				</div>
			{/if}

			{#if 'category' in container.payload}
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
			{/if}

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

			{#if 'audience' in container.payload}
				<div class="meta">
					<h3 class="meta-key">{$_('audience')}</h3>
					<ul class="meta-value">
						{#each container.payload.audience as audience}
							<li>{$_(audience)}</li>
						{/each}
					</ul>
				</div>
			{/if}

			{#if 'startDate' in container.payload || 'endDate' in container.payload}
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
		</div>
	{:else if $applicationState.containerDetailView.activeTab === 'resources'}
		<div class="details-tab" id="resources">
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
	{:else if $applicationState.containerDetailView.activeTab === 'effects'}
		<div class="details-tab" id="effects">
			<h3>{$_('effects')}</h3>

			{#await indicatorsRequest then indicators}
				{@const indicatorsByGuid = new Map(indicators.map((ic) => [ic.guid, ic]))}
				{#each container.payload.effect as effect}
					{@const indicator = indicatorsByGuid.get(effect.indicator)}
					{#if indicator}
						<IndicatorChart container={indicator} relatedContainers={[container]} showEffects>
							<a href="/indicator/{indicator.guid}" slot="caption">{indicator.payload.title}</a>
						</IndicatorChart>
					{/if}
				{/each}
			{/await}
		</div>
	{/if}
</article>

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
</style>
