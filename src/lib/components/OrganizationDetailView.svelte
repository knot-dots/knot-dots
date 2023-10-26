<script lang="ts">
	import { ChevronLeft, Icon, Pencil } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import Viewer from '$lib/components/Viewer.svelte';
	import type { Container, OrganizationalUnitContainer, OrganizationContainer } from '$lib/models';
	import { ability } from '$lib/stores';
	import Card from '$lib/components/Card.svelte';

	export let container: OrganizationContainer | OrganizationalUnitContainer;
	export let measures: Container[];
	export let strategies: Container[];

	let isPage = $page.url.pathname == `/${container.payload.type}/${container.guid}`;
</script>

<article class="details">
	<header>
		<h2>
			{#if 'image' in container.payload}
				<img alt="logo" class="logo" src={container.payload.image} />
			{/if}
			{container.payload.name}
			<span class="icons">
				{#if $ability.can('update', container)}
					<a href="{container.guid}/edit" class="icons-element" data-sveltekit-replacestate>
						<Icon solid src={Pencil} size="20" />
					</a>
				{/if}
				<button class="icons-element" type="button" on:click={() => window.history.back()}>
					<Icon solid src={ChevronLeft} size="20" />
				</button>
			</span>
		</h2>
	</header>

	<slot name="data">
		{#if 'description' in container.payload}
			<div class="description">
				<h3>{$_('description')}</h3>
				<Viewer value={container.payload.description} />
			</div>
		{/if}
	</slot>
	<div class="strategies">
		<h3>{$_('strategies')}</h3>
		<ul class="carousel">
			{#each strategies as strategy}
				<li>
					<Card --height="100%" container={strategy} />
				</li>
			{/each}
		</ul>
	</div>
	<div class="measures">
		<h3>{$_('measures')}</h3>
		<ul class="carousel">
			{#each measures as measure}
				<li>
					<Card --height="100%" container={measure} />
				</li>
			{/each}
		</ul>
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
	.carousel {
		display: flex;
		flex-direction: row;
		gap: 0.75rem;
		overflow-x: auto;
		padding-bottom: 1rem;
	}

	.carousel > li {
		flex-shrink: 0;
		width: 19.5rem;
	}
</style>
