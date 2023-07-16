<script lang="ts">
	import { Viewer } from 'bytemd';
	import { Icon, LightBulb } from 'svelte-hero-icons';
	import { _, date } from 'svelte-i18n';
	import { page } from '$app/stores';
	import ContainerDetailView from '$lib/components/ContainerDetailView.svelte';
	import { sdgIcons, statusColors, statusIcons } from '$lib/models';
	import type { Container, MeasureContainer } from '$lib/models';

	export let container: MeasureContainer;
	export let relatedContainers: Container[];
	export let revisions: Container[];

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
	</slot>

	<svelte:fragment slot="data">
		<div class="summary">
			<h3>{$_('measure.summary')}</h3>
			{container.payload.summary ?? ''}
		</div>
		<div class="description">
			<h3>{$_('measure.description')}</h3>
			<Viewer value={container.payload.description} />
		</div>
		{#if 'indicatorContribution' in container.payload}
			<div class="indicatorContribution">
				<h3>{$_('effects')}</h3>
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
		<div class="annotation">
			<h3>{$_('annotation')}</h3>
			<Viewer value={container.payload.annotation} />
		</div>
	</svelte:fragment>

	<svelte:fragment slot="meta">
		<div class="meta">
			<h3 class="meta-key">{$_('object')}</h3>
			<p class="meta-value">{$_(container.payload.type)}</p>
		</div>
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
		<div class="meta">
			<h3 class="meta-key">{$_('status.label')}</h3>
			<p class="meta-value">
				<span class="badge badge--{statusColors.get(container.payload.status)}">
					<Icon src={statusIcons.get(container.payload.status) ?? LightBulb} size="16" mini />
					{$_(container.payload.status)}
				</span>
			</p>
		</div>
		<div class="meta">
			<h3 class="meta-key">{$_('planned_duration')}</h3>
			<p class="meta-value">
				{$date(new Date(container.payload.startDate), { format: 'short' })}–{$date(
					new Date(container.payload.endDate),
					{ format: 'short' }
				)}
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
				<li>{$date(container.valid_from, { format: 'medium' })}</li>
			</ul>
		</div>
	</svelte:fragment>
</ContainerDetailView>
