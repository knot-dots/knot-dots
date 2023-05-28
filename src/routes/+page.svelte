<script lang="ts">
	import { slide } from 'svelte/transition';
	import { Icon, Pencil, XMark } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Card from '$lib/components/Card.svelte';
	import { containerTypes } from '$lib/models';
	import { user } from '$lib/stores';
	import type { PageData } from './$types';

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
		return `?${query.toString()}`;
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
	<article class="details" transition:slide={{ axis: 'x' }}>
		<header>
			<h2>{containerPreviewData?.payload.title}</h2>
			<div class="icons">
				{#if $user.isAuthenticated}
					<a
						href="{containerPreviewData.type}/{containerPreviewData?.guid}/edit"
						class="button quiet"
					>
						<Icon solid src={Pencil} size="20" />
					</a>
				{/if}
				<a href={closeOverlay()} class="button quiet"><Icon solid src={XMark} size="20" /></a>
			</div>
		</header>

		<div class="details-content">
			<div class="details-content-column">
				<div class="summary">
					<h3>{$_('summary')}</h3>
					{containerPreviewData?.payload.summary ?? ''}
				</div>
				<div class="description">
					<h3>{$_('description')}</h3>
					{containerPreviewData?.payload.description}
				</div>
			</div>
			<div class="details-content-column">
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
		<footer>
			<a class="button primary" href="/{containerPreviewData.type}/{containerPreviewData.guid}">
				{$_('read_more')}
			</a>
		</footer>
	</article>
{/if}

<style>
	.details {
		height: calc(100%);
		margin-left: -1rem;
		overflow: hidden;
		padding: 0;
		width: 100%;
	}

	.details > * {
		min-width: 100vw;
	}

	.details-content {
		padding-bottom: 1.5rem;
	}

	@media (min-width: 768px) {
		.details {
			width: 80%;
		}

		.details > * {
			min-width: calc((100vw - 18rem) * 0.8);
		}
	}

	@media (min-width: 1440px) {
		.details {
			width: 65%;
		}

		.details > * {
			min-width: calc((100vw - 18rem) * 0.65);
		}
	}

	.details footer {
		border-top: 65vw;
	}
</style>
