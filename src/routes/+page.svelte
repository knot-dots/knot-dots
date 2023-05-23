<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Card from '$lib/components/Card.svelte';
	import { containerTypes } from '$lib/models';
	import { page } from '$app/stores';
	import type { PageData } from './$types';
	import { Icon, Pencil, XMark } from 'svelte-hero-icons';
	import { user } from '$lib/stores';
	import { slide } from 'svelte/transition';

	export let data: PageData;

	const columns = [
		{ title: 'strategies', containerType: containerTypes.enum.strategy },
		{ title: 'models', containerType: containerTypes.enum.model },
		{ title: 'strategic_goals', containerType: containerTypes.enum.strategic_goal },
		{ title: 'operational_goals', containerType: containerTypes.enum.operational_goal },
		{ title: 'measures', containerType: containerTypes.enum.measure }
	];

	$: containerPreviewData = data.containerPreviewData;
	$: relationObjects = data.relationObjects;

	function closeOverlay() {
			const query = new URLSearchParams($page.url.searchParams);
			query.delete('container-preview');
			return `?${query.toString()}`
	}
</script>

<Board>
	{#each columns as column (column.title)}
		<BoardColumn title={$_(column.title)} containerType={column.containerType}>
			{#each data.containers.filter((c) => c.type === column.containerType) as container}
				<Card
					guid={container.guid}
					type={container.type}
					title={container.payload.title}
					summary={container.payload.summary ?? ''}
					category={$_(container.payload.category)}
				/>
			{/each}
		</BoardColumn>
	{/each}
</Board>

{#if containerPreviewData}
	<article class="details-overlay" transition:slide="{{ axis: "x"}}">
		<header>
			<h2>{containerPreviewData?.payload.title}</h2>
			<div class="icons">
				{#if $user.isAuthenticated}
					<a href="{containerPreviewData.type}/{containerPreviewData?.guid}/edit" class="button quiet">
						<Icon solid src={Pencil} size="20" />
					</a>
				{/if}
				<a href={closeOverlay()} class="button quiet"><Icon solid src={XMark} size="20" /></a>
			</div>
		</header>

		<div class="details-overlay-content">
			<div class="details-overlay-content-column">
				<div class="summary">
					<h3>{$_('summary')}</h3>
					{containerPreviewData?.payload.summary ?? ''}
				</div>
				<div class="description">
					<h3>{$_('description')}</h3>
					{containerPreviewData?.payload.description}
				</div>
			</div>
			<div class="details-overlay-content-column">
				<div class="meta">
					<h3 class="meta-key">{$_('category')}</h3>
					<ul class="meta-value">
						<li>{$_(containerPreviewData?.payload.category)}</li>
					</ul>
				</div>
				{#if relationObjects}
					<div class="meta">
						<h3 class="meta-key">{$_('relations')}</h3>
						<ul class="meta-value">
							{#each relationObjects as { guid, payload, type }}
								<li>
									<a href="/container/{type}/{guid}">{payload.title}</a>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			</div>
		</div>
	</article>
{/if}

<style>
	/* Container details page and form */
	.details-overlay {
		background-color: white;
		border-radius: 8px;
		border: 1px solid var(--color-gray-200);
		box-shadow: var(--shadow-lg);
		height: calc(100% + 1rem);
		flex: 1 0 calc(100% + 2rem);
		margin: -1rem;
	}

	.details-overlay header {
		align-items: center;
		border-bottom: solid 1px var(--color-gray-300);
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		margin-bottom: 24px;
		padding: 24px;
	}

	.details-overlay header h2 {
		flex-grow: 1;
		font-size: 1.125rem;
		font-weight: 600;
	}

	.details-overlay header .icons {
		display: flex;
		gap: 16px;
	}

	.details-overlay-content {
		color: var(--color-gray-500);
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		padding: 0 24px;
	}

	.details-overlay-content:before {
		border-bottom: 1px solid var(--color-gray-300);
		content: '';
		margin: 0 -24px;
	}

	.details-overlay-content > :first-child {
		order: -1;
	}

	.details-overlay-content-column {
		display: flex;
		flex-direction: column;
		flex: 1 1 100%;
		gap: 18px;
	}

	@media (min-width: 768px) {
		.details-overlay {
			flex-basis: 80%;
		}
	}

	@media (min-width: 1440px) {
		.details-overlay {
			flex-basis: 65%;
		}

		.details-overlay header {
			margin-bottom: 0;
		}

		.details-overlay-content:before {
			border-left: 1px solid var(--color-gray-300);
			content: '';
			margin: initial;
		}

		.details-overlay-content-column {
			min-width: 0;
			padding-top: 24px;
		}
	}

	.details-overlay h3 {
		color: var(--color-gray-800);
		font-size: inherit;
		font-weight: 500;
	}
</style>
