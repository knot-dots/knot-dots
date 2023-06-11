<script lang="ts">
	import { Icon, Pencil } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import ProgressBar from '$lib/components/ProgressBar.svelte';
	import { user } from '$lib/stores';
	import type { PageData } from './$types';

	export let data: PageData;

	$: container = data.container;
	$: relationObjects = data.relationObjects;
</script>

<article class="details is-page">
	<header>
		<h2>{container.payload.title}</h2>
		{#if $user.isAuthenticated}
			<div class="icons">
				<a href="{container.guid}/edit" class="button quiet">
					<Icon solid src={Pencil} size="20" />
				</a>
			</div>
		{/if}
	</header>

	<div class="details-content is-page">
		<div class="details-content-column is-page">
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
		<div class="details-content-column is-page">
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
					{#each relationObjects as { guid, payload, type }}
						<li>
							<a href="/{type}/{guid}">{payload.title}</a>
						</li>
					{/each}
				</ul>
			</div>
		</div>
	</div>
</article>
