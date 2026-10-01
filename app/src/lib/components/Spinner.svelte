<script lang="ts">
	import { _ } from 'svelte-i18n';

	interface Props {
		size?: 'base' | 'm';
	}

	let { size = 'base' }: Props = $props();
</script>

<span class={['spinner', `spinner--${size}`]}>
	<span class="is-visually-hidden">{$_('loading')}</span>
</span>

<style>
	.spinner {
		animation: spinner-rotate 0.8s linear infinite;
		border: 2px solid var(--spinner-track-color);
		border-radius: 50%;
		border-top-color: var(--spinner-color);
		display: inline-block;
		flex-shrink: 0;
	}

	.spinner--base {
		height: 1rem;
		width: 1rem;
	}

	.spinner--m {
		height: 1.25rem;
		width: 1.25rem;
	}

	@keyframes spinner-rotate {
		to {
			transform: rotate(360deg);
		}
	}

	/* A static quarter ring still reads as busy without any motion. */
	@media (prefers-reduced-motion: reduce) {
		.spinner {
			animation: none;
		}
	}
</style>
