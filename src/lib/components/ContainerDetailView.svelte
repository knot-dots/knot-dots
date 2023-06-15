<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import ProgressBar from '$lib/components/ProgressBar.svelte';
	import type { Container } from '$lib/models';

	export let container: Container;
	export let relatedContainers: Container[];

	let isPage = $page.url.pathname == `/${container.type}/${container.guid}`;
</script>

<article class="details" class:is-page={isPage}>
	<header>
		<slot name="header" />
	</header>

	<div class="details-content" class:is-page={isPage}>
		<div class="details-content-column" class:is-page={isPage}>
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
						fulfillmentDate={container.payload.indicator[0].fulfillmentDate}
						max={container.payload.indicator[0].max}
						min={container.payload.indicator[0].min}
						quantity={container.payload.indicator[0].quantity}
						value={container.payload.indicator[0].value}
					/>
				</div>
			{/if}
		</div>
		<div class="details-content-column" class:is-page={isPage}>
			{#if 'status' in container.payload}
				<div class="meta">
					<h3 class="meta-key">{$_('status.label')}</h3>
					<p class="meta-value">{$_(container.payload.status)}</p>
				</div>
			{/if}
			<div class="meta">
				<h3 class="meta-key">{$_('category')}</h3>
				<ul class="meta-value">
					<li>{$_(container.payload.category)}</li>
				</ul>
			</div>
			<div class="meta">
				<h3 class="meta-key">{$_('relations')}</h3>
				<ul class="meta-value">
					{#each relatedContainers as { guid, payload, type }}
						<li>
							<a href="/{type}/{guid}">{payload.title}</a>
						</li>
					{/each}
				</ul>
			</div>
		</div>
	</div>

	{#if !isPage}
		<footer>
			<a class="button primary" href="/{container.type}/{container.guid}">
				{$_('read_more')}
			</a>
		</footer>
	{/if}
</article>
