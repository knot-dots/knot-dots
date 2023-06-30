<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import sdg01 from '$lib/assets/sdg/sdg-01.svg';
	import sdg02 from '$lib/assets/sdg/sdg-02.svg';
	import sdg03 from '$lib/assets/sdg/sdg-03.svg';
	import sdg04 from '$lib/assets/sdg/sdg-04.svg';
	import sdg05 from '$lib/assets/sdg/sdg-05.svg';
	import sdg06 from '$lib/assets/sdg/sdg-06.svg';
	import sdg07 from '$lib/assets/sdg/sdg-07.svg';
	import sdg08 from '$lib/assets/sdg/sdg-08.svg';
	import sdg09 from '$lib/assets/sdg/sdg-09.svg';
	import sdg10 from '$lib/assets/sdg/sdg-10.svg';
	import sdg11 from '$lib/assets/sdg/sdg-11.svg';
	import sdg12 from '$lib/assets/sdg/sdg-12.svg';
	import sdg13 from '$lib/assets/sdg/sdg-13.svg';
	import sdg14 from '$lib/assets/sdg/sdg-14.svg';
	import sdg15 from '$lib/assets/sdg/sdg-15.svg';
	import sdg16 from '$lib/assets/sdg/sdg-16.svg';
	import sdg17 from '$lib/assets/sdg/sdg-17.svg';
	import ProgressBar from '$lib/components/ProgressBar.svelte';
	import type { Container, SustainableDevelopmentGoal } from '$lib/models';
	import { sustainableDevelopmentGoals } from '$lib/models';

	export let container: Container;
	export let relatedContainers: Container[];

	let sdgIcons = new Map<SustainableDevelopmentGoal, string>([
		[sustainableDevelopmentGoals.enum['sdg.01'], sdg01],
		[sustainableDevelopmentGoals.enum['sdg.02'], sdg02],
		[sustainableDevelopmentGoals.enum['sdg.03'], sdg03],
		[sustainableDevelopmentGoals.enum['sdg.04'], sdg04],
		[sustainableDevelopmentGoals.enum['sdg.05'], sdg05],
		[sustainableDevelopmentGoals.enum['sdg.06'], sdg06],
		[sustainableDevelopmentGoals.enum['sdg.07'], sdg07],
		[sustainableDevelopmentGoals.enum['sdg.08'], sdg08],
		[sustainableDevelopmentGoals.enum['sdg.09'], sdg09],
		[sustainableDevelopmentGoals.enum['sdg.10'], sdg10],
		[sustainableDevelopmentGoals.enum['sdg.11'], sdg11],
		[sustainableDevelopmentGoals.enum['sdg.12'], sdg12],
		[sustainableDevelopmentGoals.enum['sdg.13'], sdg13],
		[sustainableDevelopmentGoals.enum['sdg.14'], sdg14],
		[sustainableDevelopmentGoals.enum['sdg.15'], sdg15],
		[sustainableDevelopmentGoals.enum['sdg.16'], sdg16],
		[sustainableDevelopmentGoals.enum['sdg.17'], sdg17]
	]);

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
				{container.payload.description}
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
				<div class="meta">
					<h3 class="meta-key">{$_('topic.label')}</h3>
					<p class="meta-value">{$_(container.payload.topic)}</p>
				</div>
			{/if}
			<div class="meta">
				<h3 class="meta-key">{$_('category')}</h3>
				<ul class="meta-value">
					<li>
						<img
							src={sdgIcons.get(container.payload.category)}
							alt={$_(container.payload.category)}
							title={$_(container.payload.category)}
							width="66"
							height="66"
						/>
					</li>
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
