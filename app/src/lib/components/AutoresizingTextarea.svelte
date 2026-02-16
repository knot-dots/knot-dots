<script lang="ts">
	import type { HTMLTextareaAttributes } from 'svelte/elements';

	let { value = $bindable(), ...props }: HTMLTextareaAttributes = $props();
</script>

<span data-replicated-value={value}>
	<textarea bind:value {...props}></textarea>
</span>

<style>
	span {
		display: grid;
	}

	span::after {
		content: attr(data-replicated-value) ' ';
		visibility: hidden;
		white-space: pre-wrap;
	}

	textarea {
		--outline-offset: 0.25rem;

		background-color: revert;
		min-height: 0;
		overflow: hidden;
		resize: none;
		width: calc(100%);
	}

	span::after,
	textarea {
		border: none;
		border-radius: 8px;
		font: inherit;
		grid-area: 1 / 1 / 2 / 2;
		margin: 0;
		padding: 0;
	}
</style>
