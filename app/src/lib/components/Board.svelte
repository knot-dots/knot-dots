<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<div>
	{@render children()}
</div>

<style>
	div {
		--margin-y: 0.75rem;

		display: flex;
		flex: 1;
		gap: var(--margin-y);
		height: 100%;
		margin-right: var(--overlay-compensation-margin, 0);
		overflow-x: auto;
		padding: var(--margin-y) 0.375rem;
	}

	@container overlay (width > 0) {
		div {
			padding: var(--margin-y) 0.75rem;
			mask-image: linear-gradient(to right, transparent 0.125rem, black 0.75rem);
		}
	}
</style>
