<script lang="ts">
	import type { HTMLTextareaAttributes } from 'svelte/elements';

	let { onkeydown, value = $bindable(), ...props }: HTMLTextareaAttributes = $props();

	function handleKeydown(event: KeyboardEvent & { currentTarget: HTMLTextAreaElement }) {
		if (event.key === 'Enter') {
			event.preventDefault();
		}

		onkeydown?.(event);
	}
</script>

<span>
	<textarea bind:value {...props} onkeydown={handleKeydown}></textarea>
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
		min-height: 1.5rem;
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
