<script lang="ts">
	import Viewer from '$lib/components/Viewer.svelte';
	import { _, date } from 'svelte-i18n';
	import { page } from '$app/stores';
	import Progress from '$lib/components/Progress.svelte';
	import { isMeasureContainer, type Container } from '$lib/models';

	export let container: Container;
	export let relatedContainers: Container[];
	export let revisions: Container[];

	$: measure = isMeasureContainer(container)
		? container
		: relatedContainers.find(isMeasureContainer);

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
				{#if 'progress' in container.payload}
					<div class="progress">
						<h3>{$_('progress')}</h3>
						<Progress value={container.payload.progress} />
					</div>
				{/if}
			</slot>
		</div>

		<div class="details-content-column">
			<slot name="meta">
				<div class="meta">
					<h3 class="meta-key">{$_('object')}</h3>
					<p class="meta-value">{$_(container.payload.type)}</p>
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
						<li>{$date(container.valid_from, { format: 'medium' })}</li>
					</ul>
				</div>
			</slot>
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
