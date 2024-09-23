<script lang="ts">
	import { slide } from 'svelte/transition';
	import { relationOverlayWidth } from '$lib/stores';

	let offset = 0;

	function startExpand(event: MouseEvent) {
		offset = event.offsetX - 12;
		window.addEventListener('mousemove', expand);
	}

	function stopExpand() {
		window.removeEventListener('mousemove', expand);
	}

	function expand(event: MouseEvent) {
		$relationOverlayWidth = (window.innerWidth - event.pageX + offset) / window.innerWidth;

		if ($relationOverlayWidth * window.innerWidth < 320) {
			$relationOverlayWidth = 320 / window.innerWidth;
		} else if ($relationOverlayWidth * window.innerWidth > window.innerWidth - 400) {
			$relationOverlayWidth = 1 - 400 / window.innerWidth;
		}
	}
</script>

<svelte:window on:mouseup={stopExpand} />

<section
	class="overlay"
	style="--width-factor: {$relationOverlayWidth}"
	transition:slide={{ axis: 'x' }}
>
	<!--svelte-ignore a11y-no-static-element-interactions -->
	<div class="resize-handle" on:mousedown|preventDefault={startExpand} />
	<slot></slot>
</section>

<style>
	@media (min-width: 768px) {
		.overlay {
			--width-factor: 0.65;

			width: calc(100% * var(--width-factor));
		}

		.overlay > :global(*) {
			min-width: calc(100vw * var(--width-factor));
		}
	}

	.resize-handle {
		background-image: url(/src/lib/assets/resize-handle.svg);
		background-position: 2px center;
		background-repeat: no-repeat;
		background-clip: border-box;
		border-right: solid 2px transparent;
		cursor: ew-resize;
		height: 100%;
		left: -0.75rem;
		min-width: 0;
		position: absolute;
		width: 0.75rem;
		z-index: 1;
	}

	.resize-handle:active,
	.resize-handle:hover {
		border-color: var(--focus-color);
	}
</style>
