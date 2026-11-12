<script lang="ts" module>
	import type { IndicatorDashboardItem } from '$lib/models';

	export type Rect = { height: number; left: number; top: number; width: number };

	export type Resizing = {
		atMax: { height: boolean; width: boolean };
		axis: 'both' | 'height' | 'width';
		height: IndicatorDashboardItem['height'];
		pointer: { x: number; y: number };
		width: IndicatorDashboardItem['width'];
	};
</script>

<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { heightIcons, widthIcons } from '$lib/indicatorDashboardIcons';

	interface Props {
		columns: number;
		// Where the card lands with the height and width it snaps to
		preview: Rect;
		resizing: Resizing;
		widthText: (width: IndicatorDashboardItem['width']) => string;
	}

	let { columns, preview, resizing, widthText }: Props = $props();

	const { atMax, axis, height, pointer, width } = $derived(resizing);

	// The handle that is dragged sits on the edge of the outline, so the two move together from
	// step to step; the corner handle sits 2 px inside.
	const handle = $derived.by(() => {
		const x = axis === 'height' ? preview.left + preview.width / 2 : preview.left + preview.width;
		const y = axis === 'width' ? preview.top + preview.height / 2 : preview.top + preview.height;
		return axis === 'both' ? { x: x - 2, y: y - 2 } : { x, y };
	});

	const maxText = $derived(
		atMax.width && atMax.height
			? $_('indicator_dashboard.max_size')
			: atMax.width
				? $_('indicator_dashboard.max_width')
				: atMax.height
					? $_('indicator_dashboard.max_height')
					: undefined
	);

	const HeightIcon = $derived(heightIcons[height]);

	const WidthIcon = $derived(widthIcons[width]);
</script>

<!-- The grid shows behind the cards, the preview and the handle over them. -->
<div aria-hidden="true" class="columns system-layout">
	{#each Array.from({ length: columns }, (_, k) => k) as k (k)}
		<i></i>
	{/each}
</div>

<div aria-hidden="true" class="guides system-layout">
	<div
		class={[
			'preview',
			maxText && 'is-at-max',
			atMax.width && 'is-at-max-width',
			atMax.height && 'is-at-max-height'
		]}
		style:height="{preview.height}px"
		style:left="{preview.left}px"
		style:top="{preview.top}px"
		style:width="{preview.width}px"
	></div>
	<div
		class={[
			'handle',
			`handle--${axis}`,
			atMax.width && 'is-at-max-width',
			atMax.height && 'is-at-max-height'
		]}
		style:left="{handle.x}px"
		style:top="{handle.y}px"
	></div>
</div>

<!-- Names the height and width as the menu does, with its icons -->
<div
	aria-hidden="true"
	class="resize-tooltip"
	style:left="{pointer.x + 14}px"
	style:top="{pointer.y + 14}px"
>
	<span class="settings">
		{#if axis !== 'width'}
			<span><HeightIcon />{$_(`indicator_dashboard.height.${height}`)}</span>
		{/if}
		{#if axis !== 'height'}
			<span><WidthIcon />{widthText(width)}</span>
		{/if}
	</span>
	{#if maxText}
		<span class="max">{maxText}</span>
	{/if}
</div>

<style>
	.columns {
		display: grid;
		gap: 1rem;
		grid-template-columns: repeat(var(--columns), minmax(0, 1fr));
		inset: 0;
		position: absolute;
		z-index: 0;
	}

	.columns > i {
		background-color: var(--color-background-accent-subtle);
		opacity: 0.6;
	}

	.guides {
		inset: 0;
		pointer-events: none;
		position: absolute;
		z-index: 2;
	}

	.preview {
		background-color: rgb(from var(--color-background-accent-muted) r g b / 0.2);
		border: 1.5px dashed var(--color-border-accent-strong);
		border-radius: var(--card-border-radius);
		position: absolute;
		transition:
			height 0.12s ease,
			left 0.12s ease,
			top 0.12s ease,
			width 0.12s ease;
	}

	.preview.is-at-max {
		border-style: solid;
	}

	/* A short bump against the limit, of the outline and its handle */
	.is-at-max-width {
		animation: bump-width 0.28s ease;
	}

	.is-at-max-height {
		animation: bump-height 0.28s ease;
	}

	@keyframes bump-width {
		35% {
			translate: 4px 0;
		}
	}

	@keyframes bump-height {
		35% {
			translate: 0 4px;
		}
	}

	/* Above the preview, filled while it is dragged, centered on its point */
	.handle {
		background-color: var(--color-background-accent-strong);
		border: 1px solid var(--color-border-accent-strong);
		box-shadow: var(--shadow-sm);
		position: absolute;
		transition:
			left 0.12s ease,
			top 0.12s ease;
	}

	.handle--width {
		border-radius: 5px;
		height: 36px;
		margin: -18px 0 0 -5px;
		width: 10px;
	}

	.handle--height {
		border-radius: 5px;
		height: 10px;
		margin: -5px 0 0 -18px;
		width: 36px;
	}

	.handle--both {
		border-radius: 50%;
		height: 14px;
		margin: -7px 0 0 -7px;
		width: 14px;
	}

	.resize-tooltip {
		background-color: var(--color-surface-inverse);
		border-radius: 4px;
		color: var(--color-text-on-inverse);
		display: flex;
		flex-direction: column;
		font-size: 0.75rem;
		font-weight: 500;
		line-height: 1.5;
		padding: 0.125rem 0.375rem;
		pointer-events: none;
		position: fixed;
		z-index: 10;
	}

	.settings {
		display: flex;
		gap: 0.5rem;
	}

	.settings > span {
		align-items: center;
		display: flex;
		gap: 0.25rem;
	}

	.settings :global(svg) {
		height: 1rem;
		width: 1rem;
	}

	@media (prefers-reduced-motion: reduce) {
		.preview,
		.handle,
		.is-at-max-width,
		.is-at-max-height {
			animation: none;
			transition: none;
		}
	}
</style>
