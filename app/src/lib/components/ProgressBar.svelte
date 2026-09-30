<script lang="ts">
	import { _ } from 'svelte-i18n';
	import createDelayedFlag from '$lib/client/createDelayedFlag.svelte';

	interface Props {
		active: boolean;
		position?: 'overlay' | 'page';
	}

	let { active, position = 'page' }: Props = $props();

	const visible = createDelayedFlag(() => active);
</script>

<!-- The live region has to exist before its content changes to be announced. -->
<span class="is-visually-hidden" role="status">
	{#if visible.current}{$_('loading')}{/if}
</span>

{#if visible.current}
	<div
		aria-label={$_('loading')}
		class={['progress-bar', `progress-bar--${position}`]}
		role="progressbar"
	></div>
{/if}

<style>
	.progress-bar {
		background-color: var(--progress-bar-track-color);
		height: var(--progress-bar-height);
		left: 0;
		overflow: hidden;
		pointer-events: none;
		right: 0;
		top: 0;
	}

	.progress-bar::before {
		animation: progress-bar-indeterminate 1.2s cubic-bezier(0.65, 0, 0.35, 1) infinite;
		background-color: var(--progress-bar-color);
		content: '';
		height: 100%;
		left: 0;
		position: absolute;
		top: 0;
		width: 40%;
	}

	.progress-bar--page {
		position: fixed;
		z-index: 1001;
	}

	/* Keep clear of the rounded corner of the overlay. */
	.progress-bar--overlay {
		left: 1.5rem;
		position: absolute;
		z-index: 4;
	}

	@keyframes progress-bar-indeterminate {
		from {
			transform: translateX(-100%);
		}

		to {
			transform: translateX(250%);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.progress-bar::before {
			animation: none;
			width: 100%;
		}
	}
</style>
