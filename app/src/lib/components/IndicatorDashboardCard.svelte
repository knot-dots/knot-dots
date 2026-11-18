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
			draggable="false"
			src={transformFileURL(container.payload.icon)}
		/>
	{/if}

	<div class="top">
		<!-- The link takes the keyboard; the rest of the row only widens the target for pointers. -->
		<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
		<header class="title-row" onclick={openFromTitleRow}>
			<h3>
				{#if container.payload.icon}
					<img
						alt=""
						class="pictogram"
						draggable="false"
						src={transformFileURL(container.payload.icon)}
					/>
				{/if}
				<a
					bind:this={link}
					class="title"
					draggable="false"
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

	/* The pictogram of a stat, behind the content in the lower right corner, 8 or 16 px from the
	   outer edge of the card as in the design (the border takes 1 px). It grows with the card, up
	   to its height and to three fifths of its width, and keeps its proportions in the corner. */
	.backdrop {
		bottom: var(--backdrop-inset);
		height: calc(100% - 2 * var(--backdrop-inset));
		object-fit: contain;
		object-position: right bottom;
		pointer-events: none;
		position: absolute;
		right: var(--backdrop-inset);
		width: 60%;
		z-index: -2;
	}

	.backdrop--rows-2 {
		--backdrop-inset: calc(0.5rem - 1px);
	}

	.backdrop--rows-4 {
		--backdrop-inset: calc(1rem - 1px);
	}

	/* A veil of the surface lies over the pictogram, so the text keeps its contrast. Its width
	   follows the grid, not the card: 812 px of the 899 px of a whole row in the design, of which
	   the last two fifths fade from 85 to 15 percent. A narrow card shows its pictogram faintly, a card over the
	   whole row shows it clearly at its right end. The veil never gets narrower than in the
	   design, so on four and two columns, where the text reaches further into the card, the
	   pictogram stays faint. */
	.card:has(> .backdrop)::before {
		--veil-width: max(812px, var(--grid-width, 100%) * 812 / 899);

		background: linear-gradient(
			to right,
			rgb(from var(--color-surface-accent-default) r g b / 0.85) calc(var(--veil-width) * 0.61),
			rgb(from var(--color-surface-accent-default) r g b / 0.15) var(--veil-width)
		);
		content: '';
		inset: 0;
		pointer-events: none;
		position: absolute;
		z-index: -1;
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
