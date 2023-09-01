<script lang="ts">
	import { ChevronLeft, Icon, Pencil } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import Viewer from '$lib/components/Viewer.svelte';
	import type { Container, OrganizationalUnitContainer, OrganizationContainer } from '$lib/models';
	import { user } from '$lib/stores';
	import Card from '$lib/components/Card.svelte';

	export let container: OrganizationContainer | OrganizationalUnitContainer;
	export let measures: Container[];
	export let strategies: Container[];

	let isPage = $page.url.pathname == `/${container.payload.type}/${container.guid}`;
</script>

<div class="organization">
	<article class="details" class:details--page={isPage}>
		<header>
			<h2>
				{#if 'image' in container.payload}
					<img alt="logo" class="logo" src={container.payload.image} />
				{/if}
				{container.payload.name}
				<div class="icons">
					{#if $user.isAuthenticated}
						<a href="{container.guid}/edit" class="icons-element">
							<Icon solid src={Pencil} size="20" />
						</a>
					{/if}
					<button class="icons-element" type="button" on:click={() => window.history.back()}>
						<Icon solid src={ChevronLeft} size="20" />
					</button>
				</div>
			</h2>
		</header>

		<div class="details-content">
			<div class="details-content-column">
				<slot name="data">
					{#if 'description' in container.payload}
						<div class="description">
							<h3>{$_('description')}</h3>
							<Viewer value={container.payload.description} />
						</div>
					{/if}
				</slot>
			</div>

			<div class="details-content-column">
				<div class="strategies">
					<h3>{$_('strategies')}</h3>
					<ul class="carousel">
						{#each strategies as strategy}
							<li>
								<Card container={strategy} />
							</li>
						{/each}
					</ul>
				</div>
				<div class="measures">
					<h3>{$_('measures')}</h3>
					<ul class="carousel">
						{#each measures as measure}
							<li>
								<Card container={measure} />
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
</div>

<style>
	.organization {
		flex: 1 1;
		overflow-x: auto;
	}

	article {
		min-width: calc(100vw - 20rem);
	}

	@container (min-width: 768px) {
		.details-content {
			flex-direction: column;
		}
	}

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
