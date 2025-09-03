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
		gap: var(--margin-y);
		height: 100%;
		overflow: auto;
		padding: var(--margin-y) 0.375rem;
	}
</style>
