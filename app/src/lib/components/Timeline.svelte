<script lang="ts">
	import { getContext, tick } from 'svelte';
	import { _, locale } from 'svelte-i18n';
	import { MediaQuery } from 'svelte/reactivity';
	import CalendarMonth from '~icons/flowbite/calendar-month-outline';
	import ChevronDoubleLeft from '~icons/flowbite/chevron-double-left-outline';
	import ChevronDoubleRight from '~icons/flowbite/chevron-double-right-outline';
	import ChevronLeft from '~icons/flowbite/chevron-left-outline';
	import ChevronRight from '~icons/flowbite/chevron-right-outline';
	import ZoomIn from '~icons/flowbite/zoom-in-outline';
	import ZoomOut from '~icons/flowbite/zoom-out-outline';
	import { page } from '$app/state';
	import tooltip from '$lib/attachments/tooltip';
	import Summary from '$lib/components/Summary.svelte';
	import { overlayKey, paramsFromFragment } from '$lib/models';
	import { overlayHistory } from '$lib/stores';
	import {
		axisTicks,
		DAY,
		formatPeriod,
		layoutRows,
		machineReadable,
		zoomLevels,
		zoomRange
	} from '$lib/timeline/axis';
	import type { TimelineItem } from '$lib/timeline/toTimelineItems';

	interface Props {
		// The heading level of the title in the preview
		heading: 'h3' | 'h4' | 'h5' | 'h6';
		items: TimelineItem[];
		label: string;
		showPreview?: boolean;
	}

	let { heading, items, label, showPreview = false }: Props = $props();

	// The geometry of the track in pixels
	const cardWidth = 192;
	const cardHeight = 48;
	const rowHeight = cardHeight + 8;
	const paddingLeft = 64; // room for the actions
	const paddingRight = cardWidth + 24;
	const minTrackHeight = 176; // the height of the actions

	const overlayContext = getContext('overlay');

	const reducedMotion = new MediaQuery('prefers-reduced-motion: reduce');

	const today = Date.now();

	let scroller = $state<HTMLElement>();
	let width = $state(0);
	let scrollLeft = $state(0);
	let zoom = $state<number>();
	let includeToday = $state(false);
	// The card that is in the tab sequence, and selected if there is a preview
	let currentGuid = $state<string>();

	let detailsLink = $state<HTMLAnchorElement>();

	const id = crypto.randomUUID();

	let currentLocale = $derived($locale ?? 'de');

	// For dates without a time, a period ends at the end of its last day.
	function endOf(item: TimelineItem) {
		return item.end === undefined ? undefined : item.end + (item.allDay ? DAY : 0);
	}

	let domain = $derived.by(() => {
		const times = items.flatMap((item) => [item.start, endOf(item) ?? item.start]);
		if (includeToday) times.push(today);
		const start = Math.min(...times);
		const end = Math.max(...times);
		// At least a day, centered on a single point in time
		const missing = Math.max(DAY - (end - start), 0);
		return { end: end + missing / 2, start: start - missing / 2 };
	});

	let days = $derived((domain.end - domain.start) / DAY);

	// Fit the whole period into the width, but leave narrow screens some room
	let range = $derived(zoomRange(days, Math.max(width - paddingLeft - paddingRight, width / 2, 1)));

	let level = $derived(Math.min(Math.max(zoom ?? range.min, range.min), range.max));

	let pxPerDay = $derived(zoomLevels[level]);

	let origin = $derived(domain.start - (paddingLeft / pxPerDay) * DAY);

	let trackWidth = $derived(paddingLeft + days * pxPerDay + paddingRight);

	function x(time: number) {
		return ((time - origin) / DAY) * pxPerDay;
	}

	function timeAt(px: number) {
		return origin + (px / pxPerDay) * DAY;
	}

	let layout = $derived(
		layoutRows(
			items.map((item) => ({ end: endOf(item), start: item.start })),
			x,
			cardWidth
		)
	);

	let trackHeight = $derived(Math.max(layout.count * rowHeight + 16, minTrackHeight));

	// The track is at least as wide as the visible part.
	let trackExtent = $derived(Math.max(trackWidth, width));

	// Only the ticks around the visible part of the track, and not beyond it
	let ticks = $derived(
		axisTicks(
			timeAt(Math.max(scrollLeft - width, 0)),
			timeAt(Math.min(scrollLeft + 2 * width, trackExtent)),
			pxPerDay,
			currentLocale
		)
	);

	let showsToday = $derived(today >= timeAt(0) && today <= timeAt(trackWidth));

	let viewedGuid = $derived(paramsFromFragment(page.url).get(overlayKey.enum.view));

	let currentIndex = $derived(
		Math.max(
			items.findIndex(({ guid }) => guid === currentGuid),
			0
		)
	);

	let selected = $derived(items[currentIndex]);

	// The preview reserves room for an image only if any item has one.
	let hasImages = $derived(items.some(({ image }) => image));

	function behavior(): ScrollBehavior {
		return reducedMotion.current ? 'instant' : 'smooth';
	}

	function scrollToTime(time: number, offset = 0) {
		scroller?.scrollTo({ behavior: behavior(), left: x(time) + offset - width / 2 });
	}

	function scrollToItem(item: TimelineItem) {
		scrollToTime(item.start, cardWidth / 2);
	}

	async function changeZoom(step: number) {
		const center = timeAt(scrollLeft + width / 2);
		zoom = Math.min(Math.max(level + step, range.min), range.max);
		await tick();
		if (scroller) scroller.scrollLeft = x(center) - width / 2;
	}

	function select(index: number, { focus = false } = {}) {
		const item = items[index];
		if (!item) return;
		currentGuid = item.guid;
		scrollToItem(item);
		if (focus) {
			scroller
				?.querySelector<HTMLElement>(`[data-guid="${item.guid}"]`)
				?.focus({ preventScroll: true });
		}
	}

	async function goToToday() {
		includeToday = true;
		await tick();
		scrollToTime(today);
	}

	// The same keys with and without a preview: the cards are a single tab
	// stop, and the arrow keys, Home and End move between them.
	function handleKeydown(event: KeyboardEvent) {
		if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
		const next = (
			{
				ArrowLeft: currentIndex - 1,
				ArrowRight: currentIndex + 1,
				End: items.length - 1,
				Home: 0
			} as Record<string, number>
		)[event.key];
		if (next !== undefined) {
			event.preventDefault();
			select(Math.min(Math.max(next, 0), items.length - 1), { focus: true });
		} else if (event.key === 'Enter' && showPreview) {
			// Like the links without a preview, Enter opens the object.
			event.preventDefault();
			detailsLink?.click();
		}
	}

	// Like Card.svelte, start a new overlay history unless already in an overlay.
	function updateOverlayHistory(event: MouseEvent) {
		if (!overlayContext) {
			$overlayHistory = [
				new URLSearchParams((event.currentTarget as HTMLAnchorElement).hash.substring(1))
			];
		}
	}
</script>

<section aria-label={label} class="timeline">
	{#if showPreview && selected}
		<div class="timeline-preview" class:has-images={hasImages}>
			<button
				class="action-button action-button--padding-tight timeline-preview-button"
				disabled={currentIndex === 0}
				onclick={() => select(currentIndex - 1)}
				type="button"
				{@attach tooltip($_('timeline.previous'))}
			>
				<ChevronLeft />
			</button>

			<div
				aria-labelledby="{id}-tab-{selected.guid}"
				class="timeline-preview-panel"
				id="{id}-panel"
				role="tabpanel"
			>
				<div class="timeline-preview-text">
					<time datetime={machineReadable(selected.start, selected.allDay)}>
						{formatPeriod(selected, currentLocale)}
					</time>
					<svelte:element this={heading} class="timeline-preview-title">
						{selected.title}
					</svelte:element>
					<p class={selected.badge.module ? `module-${selected.badge.module}` : undefined}>
						<span class="badge">{selected.badge.label}</span>
					</p>
					<div class="timeline-preview-summary">
						<Summary container={selected.container} />
					</div>
					<p>
						<a
							bind:this={detailsLink}
							class="button button-alternate button-sm system-primary"
							href={selected.href}
							onclick={updateOverlayHistory}
						>
							{$_('timeline.show_details')}
						</a>
					</p>
				</div>
				{#if selected.image}
					<figure>
						<img alt="" src={selected.image.url} />
						{#if selected.image.credit}
							<figcaption>{selected.image.credit}</figcaption>
						{/if}
					</figure>
				{/if}
			</div>

			<button
				class="action-button action-button--padding-tight timeline-preview-button"
				disabled={currentIndex === items.length - 1}
				onclick={() => select(currentIndex + 1)}
				type="button"
				{@attach tooltip($_('timeline.next'))}
			>
				<ChevronRight />
			</button>
		</div>
	{/if}

	<div class="timeline-navigation" style:--track-height="{trackHeight}px">
		<div class="timeline-actions" role="toolbar" aria-label={$_('timeline.actions')}>
			<button
				class="action-button action-button--padding-tight"
				disabled={level >= range.max}
				onclick={() => changeZoom(1)}
				type="button"
				{@attach tooltip($_('timeline.zoom_in'), { placement: 'right' })}
			>
				<ZoomIn />
			</button>
			<button
				class="action-button action-button--padding-tight"
				disabled={level <= range.min}
				onclick={() => changeZoom(-1)}
				type="button"
				{@attach tooltip($_('timeline.zoom_out'), { placement: 'right' })}
			>
				<ZoomOut />
			</button>
			<button
				class="action-button action-button--padding-tight"
				onclick={() => select(0)}
				type="button"
				{@attach tooltip($_('timeline.go_to_start'), { placement: 'right' })}
			>
				<ChevronDoubleLeft />
			</button>
			<button
				class="action-button action-button--padding-tight"
				onclick={() => select(items.length - 1)}
				type="button"
				{@attach tooltip($_('timeline.go_to_end'), { placement: 'right' })}
			>
				<ChevronDoubleRight />
			</button>
			<button
				class="action-button action-button--padding-tight"
				onclick={goToToday}
				type="button"
				{@attach tooltip($_('timeline.go_to_today'), { placement: 'right' })}
			>
				<CalendarMonth />
			</button>
		</div>

		<div
			bind:clientWidth={width}
			bind:this={scroller}
			class="timeline-scroller"
			onscroll={() => (scrollLeft = scroller?.scrollLeft ?? 0)}
		>
			<div class="timeline-track" style:width="{trackWidth}px">
				{#if showsToday}
					<div class="timeline-today" style:left="{x(today)}px">
						<span>{$_('timeline.today')}</span>
					</div>
				{/if}

				<ol
					aria-label={showPreview ? label : undefined}
					aria-orientation={showPreview ? 'horizontal' : undefined}
					class="timeline-items"
					onkeydown={handleKeydown}
					role={showPreview ? 'tablist' : undefined}
				>
					{#each items as item, index (item.guid)}
						{@const left = x(item.start)}
						{@const end = endOf(item)}
						{@const top = 8 + layout.rows[index] * rowHeight}
						{@const isActive =
							viewedGuid === item.guid || (showPreview && selected?.guid === item.guid)}
						<li
							class="timeline-item"
							class:is-active={isActive}
							role={showPreview ? 'presentation' : undefined}
							style:--top="{top}px"
							style:left="{left}px"
							style:top="{top}px"
							style:width="{Math.max(cardWidth, end === undefined ? 0 : x(end) - left)}px"
						>
							{#if showPreview}
								<button
									aria-controls="{id}-panel"
									aria-selected={index === currentIndex}
									class="timeline-card"
									data-guid={item.guid}
									id="{id}-tab-{item.guid}"
									onclick={() => select(index)}
									role="tab"
									tabindex={index === currentIndex ? 0 : -1}
									type="button"
								>
									{@render cardContent(item)}
								</button>
							{:else}
								<a
									class="timeline-card"
									data-guid={item.guid}
									href={item.href}
									onclick={updateOverlayHistory}
									onfocus={() => (currentGuid = item.guid)}
									tabindex={index === currentIndex ? 0 : -1}
								>
									{@render cardContent(item)}
								</a>
							{/if}
							<span
								aria-hidden="true"
								class="timeline-stem"
								style:height="{trackHeight - top - cardHeight + 8}px"
							></span>
							{#if end === undefined}
								<span aria-hidden="true" class="timeline-dot"></span>
							{:else}
								<span
									aria-hidden="true"
									class="timeline-span"
									style:width="{Math.max(x(end) - left, 2)}px"
								></span>
							{/if}
						</li>
					{/each}
				</ol>

				<div aria-hidden="true" class="timeline-axis">
					{#each ticks.minor as minorTick (minorTick.time)}
						<span class="timeline-tick" style:left="{x(minorTick.time)}px">
							{minorTick.label}
						</span>
					{/each}
					{#each ticks.major as majorTick (majorTick.time)}
						<span class="timeline-tick timeline-tick--major" style:left="{x(majorTick.time)}px">
							{majorTick.label}
						</span>
					{/each}
				</div>
			</div>
		</div>
	</div>
</section>

{#snippet cardContent(item: TimelineItem)}
	<time datetime={machineReadable(item.start, item.allDay)}>
		{formatPeriod(item, currentLocale, 'medium')}
	</time>
	<span class="timeline-card-title">{item.title}</span>
{/snippet}

<style>
	/*
	 * Like the carousel, the timeline overrides the maximum width of the
	 * children of a section, so that the time axis can span the full width.
	 * The content of the preview keeps it.
	 */
	.timeline {
		container-type: inline-size;
		/* Keep the positioned elements below overlays */
		isolation: isolate;
		max-width: none;
		width: 100%;
	}

	/* Preview */

	/*
	 * The preview has a fixed height so that neither the buttons nor the axis
	 * move when another item with more or less content is selected. Title and
	 * summary are truncated to fit into it.
	 */
	.timeline-preview {
		--preview-height: 20rem;
		--summary-lines: 4;
		/* The room the buttons need from the edge of the full width */
		--button-room: calc(0.75rem + 1.75rem + 0.5rem);

		padding: 1.5rem 0;
		position: relative;
	}

	/*
	 * The text is aligned with the section title. The buttons are outside of
	 * the content area, in line with the actions of the time axis.
	 */
	.timeline-preview-button {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
	}

	.timeline-preview-button:first-child {
		left: calc(var(--carousel-margin-left, 0px) + 0.75rem);
	}

	.timeline-preview-button:last-child {
		right: calc(var(--carousel-margin-right, 0px) + 0.75rem);
	}

	.timeline-preview-panel {
		align-items: safe center;
		display: flex;
		gap: 2rem;
		height: var(--preview-height);
		min-width: 0;
		overflow: hidden;
		/* Only where the margin is too narrow for the buttons */
		padding-left: max(0px, calc(var(--button-room) + var(--carousel-margin-left, 0px)));
		padding-right: max(0px, calc(var(--button-room) + var(--carousel-margin-right, 0px)));
	}

	/*
	 * Text and image share the width of the section, but neither gets wider
	 * than the content area.
	 */
	.timeline-preview-text {
		display: flex;
		flex: 1 1 0;
		flex-direction: column;
		gap: 0.75rem;
		max-width: var(--details-max-width, none);
		min-width: 0;
	}

	.timeline-preview-text time {
		color: var(--color-text-subtle);
		font-size: 0.875rem;
		font-weight: 500;
	}

	.timeline-preview-title {
		-webkit-box-orient: vertical;
		color: var(--color-text-strong);
		display: -webkit-box;
		font-size: 1.25rem;
		font-weight: 600;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		line-height: 1.4;
		overflow: hidden;
	}

	.timeline-preview-text :is(p, .timeline-preview-summary) {
		color: var(--color-text-default);
		font-size: 0.875rem;
		line-height: 1.5;
	}

	.timeline-preview-summary:empty {
		display: none;
	}

	.timeline-preview-summary {
		-webkit-box-orient: vertical;
		display: -webkit-box;
		-webkit-line-clamp: var(--summary-lines);
		line-clamp: var(--summary-lines);
		overflow: hidden;
	}

	/* The same type badge as in Badges.svelte */
	.timeline-preview .badge {
		--badge-border-radius: 6px;
		--badge-border-width: 1px;
		--badge-min-height: 1.75rem;
		--badge-padding-x: 0.5rem;
	}

	.timeline-preview figure {
		flex: 1 1 0;
		max-width: var(--details-max-width, none);
		min-width: 0;
	}

	.timeline-preview img {
		border-radius: 8px;
		max-height: var(--preview-height);
		object-fit: contain;
	}

	.timeline-preview figcaption {
		color: var(--color-text-muted);
		font-size: 0.75rem;
		margin-top: 0.375rem;
		text-align: right;
	}

	@container (max-width: 40rem) {
		.timeline-preview {
			--preview-height: 19rem;
			--summary-lines: 3;
		}

		/*
		 * Images span the full width with their aspect ratio, but are at most
		 * half as high as the timeline is wide, which the preview reserves.
		 */
		.timeline-preview.has-images {
			--image-height: 50cqi;
			--preview-height: calc(19rem + 2rem + var(--image-height));
		}

		.timeline-preview-panel {
			align-items: stretch;
			flex-direction: column;
			justify-content: safe center;
		}

		.timeline-preview :is(.timeline-preview-text, figure) {
			flex: none;
			width: 100%;
		}

		.timeline-preview img {
			height: auto;
			max-height: var(--image-height);
			width: 100%;
		}
	}

	/* Time navigation */

	/* Only the time axis spans the full width of the content area, like the carousel. */
	.timeline-navigation {
		border-top: 1px solid var(--color-border-default);
		margin: 0 var(--carousel-margin-right, 0) 0 var(--carousel-margin-left, 0);
		max-width: var(--carousel-max-width, 100%);
		position: relative;
	}

	/* Arranged like the block actions of DraggableActionBar.svelte, but vertically */
	.timeline-actions {
		background-color: var(--color-surface-default);
		border-radius: 12px;
		box-shadow: var(--shadow-sm);
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		left: 0.5rem;
		padding: 0.25rem;
		position: absolute;
		top: calc(var(--track-height) / 2);
		transform: translateY(-50%);
		z-index: 2;
	}

	.timeline-scroller {
		overflow-x: auto;
		overscroll-behavior-x: contain;
	}

	/* At least as wide as the visible part, so that the axis spans it */
	.timeline-track {
		height: calc(var(--track-height) + 3rem);
		min-width: 100%;
		position: relative;
	}

	/*
	 * No stacking context, so that dots and spans (1) are above the axis, the
	 * label of today (2) above them, and an expanded card (3) above all.
	 */
	.timeline-items {
		height: var(--track-height);
		position: relative;
	}

	.timeline-item {
		position: absolute;
	}

	/* Also for buttons, which are centered by the global styles */
	.timeline-card {
		align-items: stretch;
		background-color: var(--color-surface-default);
		border: 1px solid var(--color-border-default);
		border-radius: 8px;
		box-shadow: var(--shadow-sm);
		color: var(--color-text-default);
		display: flex;
		flex-direction: column;
		font-size: 0.75rem;
		font-weight: 400;
		gap: 0.125rem;
		height: 3rem;
		justify-content: center;
		max-width: 100%;
		padding: 0.25rem 0.5rem;
		position: relative;
		text-align: left;
		text-decoration: none;
		width: 12rem;
		z-index: 1;
	}

	.timeline-card:hover {
		background-color: var(--color-gray-100);
	}

	.is-active .timeline-card {
		background-color: var(--color-primary-050);
		border-color: var(--color-primary-700);
	}

	.timeline-card :is(time, .timeline-card-title) {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/*
	 * On hover and focus, the card expands over its neighbors to show the
	 * whole title, without moving anything else.
	 */
	.timeline-card:is(:hover, :focus-visible) {
		box-shadow: var(--shadow-md);
		height: auto;
		max-width: 24rem;
		min-height: 3rem;
		min-width: 12rem;
		width: max-content;
		z-index: 3;
	}

	.timeline-card:is(:hover, :focus-visible) :is(time, .timeline-card-title) {
		overflow: visible;
		white-space: normal;
	}

	.timeline-card time {
		color: var(--color-text-subtle);
	}

	.timeline-card-title {
		color: var(--color-text-strong);
		font-size: 0.875rem;
		font-weight: 500;
	}

	.is-active .timeline-card-title {
		color: var(--color-primary-700);
	}

	/* Starts behind the rounded corner of the card to continue its left border */
	.timeline-stem {
		border-left: 1px solid var(--color-border-default);
		left: 0;
		position: absolute;
		top: calc(3rem - 8px);
	}

	.is-active .timeline-stem {
		border-color: var(--color-primary-700);
	}

	/* Dot and span are centered on the top border of the axis. */
	.timeline-dot,
	.timeline-span {
		background-color: var(--color-gray-300);
		left: 0;
		position: absolute;
		top: calc(var(--track-height) - var(--top, 0px));
		z-index: 1;
	}

	.timeline-dot {
		border-radius: 50%;
		height: 7px;
		transform: translate(-3px, -3px);
		width: 7px;
	}

	.timeline-span {
		background-color: var(--color-primary-300);
		border-radius: 3px;
		height: 6px;
		transform: translateY(-2.5px);
	}

	.is-active :is(.timeline-dot, .timeline-span) {
		background-color: var(--color-primary-700);
	}

	.timeline-today {
		border-left: 2px solid var(--color-orange-400);
		height: var(--track-height);
		position: absolute;
		top: 0;
	}

	/*
	 * Centered on the line and on the top border of the axis like dots and
	 * spans, and above them, while the line stays behind the cards
	 */
	.timeline-today span {
		background-color: var(--color-orange-400);
		border-radius: 4px;
		color: var(--color-white);
		font-size: 0.625rem;
		font-weight: 600;
		left: 0;
		line-height: 1rem;
		padding: 0 0.25rem;
		position: absolute;
		top: calc(100% + 0.5px);
		/* The line is 2px wide */
		transform: translate(calc(-50% - 1px), -50%);
		white-space: nowrap;
		z-index: 2;
	}

	/* Time axis */

	/* Labels at the ends must not extend the scrollable area beyond the axis. */
	.timeline-axis {
		border-top: 1px solid var(--color-border-default);
		height: 3rem;
		overflow-x: clip;
		position: relative;
	}

	.timeline-tick {
		color: var(--color-text-muted);
		font-size: 0.6875rem;
		padding-top: 0.625rem;
		position: absolute;
		top: 0;
		transform: translateX(-50%);
		white-space: nowrap;
	}

	.timeline-tick::before {
		background-color: var(--color-gray-300);
		content: '';
		height: 0.375rem;
		left: 50%;
		position: absolute;
		top: 0;
		width: 1px;
	}

	/* A longer tick for major ticks, and more space to move them below the minor ones */
	.timeline-tick--major {
		color: var(--color-text-subtle);
		font-size: 0.75rem;
		font-weight: 600;
		padding-top: 1.75rem;
	}

	.timeline-tick--major::before {
		background-color: var(--color-gray-400);
		height: 0.625rem;
	}
</style>
