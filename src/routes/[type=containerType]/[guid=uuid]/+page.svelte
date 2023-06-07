<script lang="ts">
	import { Icon, Pencil } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
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
