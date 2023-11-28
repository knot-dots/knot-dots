<script lang="ts">
	import { ArrowDownTray, Icon } from 'svelte-hero-icons';
	import { _, date } from 'svelte-i18n';
	import { page } from '$app/stores';
	import paramsFromURL from '$lib/client/paramsFromURL';
	import IndicatorChart from '$lib/components/IndicatorChart.svelte';
	import ProgressBar from '$lib/components/ProgressBar.svelte';
	import Viewer from '$lib/components/Viewer.svelte';
	import {
		isContainer,
		isIndicatorContainer,
		isLevel,
		isMeasureContainer,
		isStrategyContainer,
		owners
	} from '$lib/models';
	import type { AnyContainer, Container } from '$lib/models';
	import { sdgIcons } from '$lib/theme/models';
	import { applicationState } from '$lib/stores';

	export let container: AnyContainer;
	export let relatedContainers: Container[];
	export let revisions: AnyContainer[];

	applicationState.update((state) => ({ ...state, containerDetailView: { tabs: [] } }));

	$: strategy = isStrategyContainer(container)
		? container
		: relatedContainers.find(isStrategyContainer);

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

<article class="details">
	<slot name="data">
		{#if 'summary' in container.payload}
			<div class="summary">
				<h3>{$_('summary')}</h3>
				{container.payload.summary ?? ''}
			</div>
		{/if}

		{#if 'description' in container.payload}
			<div class="description">
				<h3>{$_('description')}</h3>
				<Viewer value={container.payload.description} />
			</div>
		{/if}

		{#if 'body' in container.payload}
			<div class="body">
				<h3>{$_('Body')}</h3>
				<Viewer value={container.payload.body} />
			</div>
		{/if}

		{#if 'image' in container.payload}
			<div class="image">
				<img alt={$_('cover_image')} src={container.payload.image} />
			</div>
		{/if}

		{#if 'indicator' in container.payload && container.payload.indicator.length > 0}
			<div class="indicator">
				<h3>{$_('indicator.legend')}</h3>
				<ProgressBar
					guid={container.guid}
					indicator={container.payload.indicator[0]}
					contributors={relatedContainers.filter(isMeasureContainer)}
				/>
			</div>
		{/if}

		{#if isIndicatorContainer(container)}
			<IndicatorChart {container} {relatedContainers} />
		{/if}
	</slot>

	<slot name="meta">
		<div class="meta">
			<h3 class="meta-key">{$_('object')}</h3>
			<p class="meta-value">{$_(container.payload.type)}</p>
		</div>
		{#if 'strategyType' in container.payload}
			<div class="meta">
				<h3 class="meta-key">{$_('strategy_type.label')}</h3>
				<p class="meta-value">{$_(container.payload.strategyType)}</p>
			</div>
		{:else if strategy}
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
					{#each container.payload.topic as topic}
						<li>{$_(topic)}</li>
					{/each}
				</ul>
			</div>
		{/if}
		{#if 'category' in container.payload}
			<div class="meta">
				<h3 class="meta-key">{$_('category')}</h3>
				<ul class="meta-value meta-value--category">
					{#each container.payload.category as category}
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
		{#if 'level' in container.payload && isLevel(container.payload.level)}
			<div class="meta">
				<h3 class="meta-key">{$_('level.label')}</h3>
				<p class="meta-value">{$_(container.payload.level)}</p>
			</div>
		{/if}
		{#if isContainer(container)}
			<div class="meta">
				<h3 class="meta-key">{$_('owned_by')}</h3>
				<ul class="meta-value">
					{#each owners( container, [...$page.data.organizations, ...$page.data.organizationalUnits] ) as owner}
						<li>{owner.payload.name}</li>
					{/each}
				</ul>
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
		{#if 'pdf' in container.payload && container.payload.pdf}
			<div class="meta">
				<h3 class="meta-key">{$_('pdf')}</h3>
				<p class="meta-value">
					<a href={container.payload.pdf}>
						{$_('download')}
						<Icon src={ArrowDownTray} size="20" mini />
					</a>
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
				<li>{$date(container.valid_from, { format: 'medium' })}</li>
			</ul>
		</div>
	</slot>
</article>
