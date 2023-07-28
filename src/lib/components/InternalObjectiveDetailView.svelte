<script lang="ts">
	import { Viewer } from 'bytemd';
	import { _, date } from 'svelte-i18n';
	import { page } from '$app/stores';
	import ProgressBar from '$lib/components/ProgressBar.svelte';
	import { isMeasureContainer, isStrategyContainer, sdgIcons } from '$lib/models';

	import type { Container } from '$lib/models';

	export let container: Container;
	export let relatedContainers: Container[];
	export let revisions: Container[];

	$: strategy = isStrategyContainer(container)
		? container
		: relatedContainers.find(isStrategyContainer);

	let isPage = $page.url.pathname == `/${container.payload.type}/${container.guid}`;
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
			</slot>
		</div>

		<div class="details-content-column">
			<slot name="meta">
				<div class="meta">
					<h3 class="meta-key">{$_('object')}</h3>
					<p class="meta-value">{$_(container.payload.type)}</p>
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
