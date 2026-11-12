<script lang="ts">
	import { getContext, type Snippet } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import IndicatorDashboardChart from '$lib/components/IndicatorDashboardChart.svelte';
	import IndicatorDashboardStat from '$lib/components/IndicatorDashboardStat.svelte';
	import Summary from '$lib/components/Summary.svelte';
	import TargetCheck from '$lib/components/TargetCheck.svelte';
	import { getReviewContext } from '$lib/contexts/review.svelte';
	import { indicatorActualDataContainers } from '$lib/indicatorActualData';
	import { rowsByHeight } from '$lib/indicatorDashboardLayout';
	import {
		type AnyPayload,
		type Container,
		type IndicatorDashboardItem,
		type IndicatorPayload,
		overlayKey,
		overlayURL,
		paramsFromFragment
	} from '$lib/models';
	import { reviewIndicator } from '$lib/reviewStatus';
	import { overlayHistory } from '$lib/stores';
	import { reviewStatusAuraColor } from '$lib/theme/models';
	import transformFileURL from '$lib/transformFileURL';

	interface Props {
		container: Container<IndicatorPayload>;
		height: IndicatorDashboardItem['height'];
		relatedContainers: Container<AnyPayload>[];
		// Beside the title row, outside of the area that opens the indicator
		settings?: Snippet;
		view: IndicatorDashboardItem['view'];
	}

	let { container, height, relatedContainers, settings, view }: Props = $props();

	const overlayContext = getContext('overlay');

	const review = getReviewContext();

	const reviewStatus = $derived(
		reviewIndicator(
			container,
			relatedContainers,
			review.objectivesByIndicator.get(container.guid) ?? []
		)?.status
	);

	const auraColor = $derived(reviewStatus && reviewStatusAuraColor(reviewStatus));

	const source = $derived(
		indicatorActualDataContainers(container.guid, relatedContainers)[0]?.payload.source
	);

	let link = $state<HTMLAnchorElement>();

	// Only the title row opens the indicator, all of it rather than just the title. The body stays
	// free for interacting with the chart.
	function openFromTitleRow(event: MouseEvent) {
		if (!link || link.contains(event.target as Node) || window.getSelection()?.toString()) {
			return;
		}
		link.click();
	}

	function updateOverlayHistory(event: MouseEvent) {
		if (!overlayContext) {
			$overlayHistory = [
				new URLSearchParams((event.currentTarget as HTMLAnchorElement).hash.substring(1))
			];
		}
	}
</script>

<article
	class={[
		'card',
		`card--rows-${rowsByHeight[height]}`,
		paramsFromFragment(page.url).get(overlayKey.enum.view) === container.guid && 'is-active'
	]}
	style:--aura-color={auraColor}
>
	{#if view === 'stat' && height !== '1/4' && container.payload.icon}
		<img
			alt=""
			class={['backdrop', `backdrop--rows-${rowsByHeight[height]}`]}
			src={transformFileURL(container.payload.icon)}
		/>
	{/if}

	<div class="top">
		<!-- The link takes the keyboard; the rest of the row only widens the target for pointers. -->
		<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
		<header class="title-row" onclick={openFromTitleRow}>
			<h3>
				{#if container.payload.icon}
					<img alt="" class="pictogram" src={transformFileURL(container.payload.icon)} />
				{/if}
				<a
					bind:this={link}
					class="title"
					href={overlayURL(page.url, overlayKey.enum.view, container.guid)}
					onclick={updateOverlayHistory}
					title={container.payload.title}
				>
					{container.payload.title}
				</a>
				{#if reviewStatus}
					<TargetCheck status={reviewStatus} />
				{/if}
			</h3>
			{#if height === '4/4'}
				<div class="description">
					<Summary {container} />
				</div>
			{/if}
		</header>

		{#if settings}
			<div class="settings">
				{@render settings()}
			</div>
		{/if}
	</div>

	<div class="body">
		{#if view === 'stat'}
			<IndicatorDashboardStat {container} {height} {relatedContainers} />
		{:else}
			<IndicatorDashboardChart
				{container}
				{relatedContainers}
				variant={height === '1/4' ? 'sparkline' : 'chart'}
			/>
		{/if}
	</div>

	{#if height !== '1/4' && source}
		<footer>{$_('indicator.source')}: {source}</footer>
	{/if}
</article>

<style>
	.card {
		background: radial-gradient(
				circle at calc(100% - 20px) 20px,
				var(--aura-color, transparent) 30px,
				transparent 170px
			)
			var(--color-surface-accent-default);
		border: 1px solid var(--color-border-accent-subtle);
		border-radius: var(--card-border-radius);
		box-shadow: var(--shadow-sm);
		container-type: inline-size;
		display: flex;
		flex-direction: column;
		height: 100%;
		isolation: isolate;
		overflow: hidden;
		padding: 0.5rem;
		position: relative;
	}

	/* An open menu lies above the cards that follow. */
	.card:has(.settings :global([aria-expanded='true'])) {
		z-index: 1;
	}

	/* The pictogram of a stat, faint behind the content in the lower right corner, 8 or 16 px from
	   the outer edge of the card as in the design (the border takes 1 px). It is 155 or 290 px at
	   rows of 84 px and grows with the rows on large screens, but never wider than the card
	   allows. A pictogram that is not square keeps its proportions in the corner. */
	.backdrop {
		aspect-ratio: 1;
		bottom: var(--backdrop-inset);
		object-fit: contain;
		object-position: right bottom;
		opacity: 0.14;
		pointer-events: none;
		position: absolute;
		right: var(--backdrop-inset);
		width: min(var(--backdrop-size), 100% - 2 * var(--backdrop-inset));
		z-index: -1;
	}

	.backdrop--rows-2 {
		--backdrop-inset: calc(0.5rem - 1px);
		--backdrop-size: calc(var(--row-height, 84px) * 155 / 84);
	}

	.backdrop--rows-4 {
		--backdrop-inset: calc(1rem - 1px);
		--backdrop-size: calc(var(--row-height, 84px) * 290 / 84);
	}

	.top {
		align-items: flex-start;
		display: flex;
	}

	.card--rows-1 .top {
		align-items: center;
	}

	.top > .title-row {
		flex: 1;
		min-width: 0;
	}

	/* The menu button is 28 px, centered on the title line of 24 px with 8 px padding. */
	.settings {
		flex-shrink: 0;
		padding-top: 6px;
	}

	.card--rows-1 .settings {
		padding-top: 0;
	}

	/* The title takes the whole row. The menu button only shows while the title row is hovered or
	   focused, or its menu is open, and then takes room from the title. */
	@media (hover: hover) {
		.top:not(:hover, :focus-within) > .settings:not(:has(:global([aria-expanded='true']))) {
			display: none;
		}
	}

	.settings :global(.dropdown-button) {
		--dropdown-button-border-radius: 4px;
		--dropdown-button-expanded-background: var(--color-background-accent-expanded);
		--dropdown-button-padding: 0.25rem;
	}

	/* The indicator is open in the overlay, as in Card. */
	.card.is-active {
		background-color: var(--color-primary-050);
		border-color: var(--color-primary-700);
	}

	/* Overrides the headers of .details-section, which the dashboard is part of. */
	.title-row {
		align-items: stretch;
		border-radius: 0.5rem;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin: 0;
		padding: 0.5rem;
	}

	.card--rows-1 .title-row {
		padding-block: 0.25rem;
	}

	.title-row:has(.title:focus-visible) {
		outline: 2px solid var(--focus-color);
		outline-offset: -2px;
	}

	h3 {
		align-items: center;
		display: flex;
		font-size: 1rem;
		font-weight: 500;
		gap: 0.75rem;
		line-height: 1.5;
		margin: 0;
	}

	.card--rows-1 h3 {
		font-size: 0.875rem;
		font-weight: 400;
	}

	.pictogram {
		flex-shrink: 0;
		height: 1.5rem;
		width: 1.5rem;
	}

	.title {
		color: var(--color-text-strong);
		display: -webkit-box;
		flex: 1;
		line-clamp: 2;
		min-width: 0;
		overflow: hidden;
		text-decoration: none;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
	}

	/* Medium cards have room for a chart only below a title on one line. */
	.card--rows-2 .title,
	.card--rows-1 .title {
		line-clamp: 1;
		-webkit-line-clamp: 1;
	}

	.card--rows-1 .title {
		color: var(--color-text-default);
	}

	.title:focus-visible {
		outline: none;
	}

	.description {
		color: var(--color-text-default);
		font-size: 0.75rem;
		line-height: 1.5;
	}

	.description :global(p) {
		display: -webkit-box;
		line-clamp: 2;
		margin: 0;
		overflow: hidden;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
	}

	.body {
		display: flex;
		flex: 1;
		flex-direction: column;
		min-height: 0;
		padding-inline: 0.5rem;
	}

	footer {
		color: var(--color-text-muted);
		font-size: 0.75rem;
		font-weight: 500;
		line-height: 1.5;
		overflow: hidden;
		padding: 0.5rem;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	@media (hover: hover) {
		.title-row:hover {
			background-color: var(--color-background-accent-hover);
		}
	}
</style>
