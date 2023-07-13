<script lang="ts">
	import { Viewer } from 'bytemd';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import ProgressBar from '$lib/components/ProgressBar.svelte';
	import { sdgIcons } from '$lib/models';
	import type { Container } from '$lib/models';

	export let container: Container;
	export let relatedContainers: Container[];

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

<article class="details" class:details--page={isPage}>
	<header>
		<slot name="header" />
	</header>

	<div class="details-content">
		<div class="details-content-column">
			<div class="summary">
				<h3>{$_('summary')}</h3>
				{container.payload.summary ?? ''}
			</div>
			<div class="description">
				<h3>{$_('description')}</h3>
				<Viewer value={container.payload.description}/>
			</div>
			{#if 'indicator' in container.payload && container.payload.indicator.length > 0}
				<div class="indicator">
					<h3>{$_('indicator.legend')}</h3>
					<ProgressBar
						guid={container.guid}
						indicator={container.payload.indicator[0]}
						contributors={relatedContainers}
					/>
				</div>
			{/if}
			{#if 'indicatorContribution' in container.payload}
				<div class="indicatorContribution">
					<h3>{$_('indicator.contribution')}</h3>
					{#each relatedContainers as { guid, payload }}
						{#if 'indicator' in payload && payload.indicator.length > 0 && 'quantity' in payload.indicator[0]}
							<h4>
								<a href={containerURL(payload.type, guid)}>{payload.title}</a>
							</h4>
							<p>
								{$_(`${payload.indicator[0].quantity}.description`, {
									values: { contribution: container.payload.indicatorContribution?.[guid] ?? 0 }
								})}
							</p>
						{/if}
					{/each}
				</div>
			{/if}
		</div>
		<div class="details-content-column">
			{#if 'status' in container.payload}
				<div class="meta">
					<h3 class="meta-key">{$_('status.label')}</h3>
					<p class="meta-value">{$_(container.payload.status)}</p>
				</div>
			{/if}
			{#if 'level' in container.payload && 'strategyType' in container.payload && 'topic' in container.payload}
				<div class="meta">
					<h3 class="meta-key">{$_('level.label')}</h3>
					<p class="meta-value">{$_(container.payload.level)}</p>
				</div>
				<div class="meta">
					<h3 class="meta-key">{$_('strategy_type.label')}</h3>
					<p class="meta-value">{$_(container.payload.strategyType)}</p>
				</div>
			{/if}
			<div class="meta">
				<h3 class="meta-key">{$_('topic.label')}</h3>
				<ul class="meta-value meta-value--topic">
					{#each container.payload.topic as topic}
						<li>{$_(topic)}</li>
					{/each}
				</ul>
			</div>
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
		</div>
	</div>

	{#if !isPage}
		<footer>
			<a class="button primary" href="/{container.payload.type}/{container.guid}">
				{$_('read_more')}
			</a>
		</footer>
	{/if}
</article>

<style>
	.meta-value--category li {
		display: inline-block;
	}
</style>
