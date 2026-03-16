<script lang="ts">
	import type { Snippet } from 'svelte';
	import { dragHandle } from 'svelte-dnd-action';
	import DragHandle from '~icons/knotdots/draghandle';

	type Props = {
		actions?: Snippet;
	};

	let { actions }: Props = $props();
</script>

<div class="actions is-visible-on-hover">
	{#if actions}{@render actions()}{/if}
	<span class="drag-handle" use:dragHandle>
		<DragHandle />
	</span>
</div>

<style>
	.actions {
		--dropdown-button-icon-default-color: var(--color-gray-700);
		--dropdown-button-icon-size: 1rem;

		align-items: center;
		background-color: white;
		border-radius: 12px;
		box-shadow: var(--shadow-sm);
		display: flex;
		gap: 0.25rem;
		left: var(--actions-left, -3.25rem);
		padding: 0.25rem;
		position: absolute;
		top: var(--actions-top, 1.25rem);
		z-index: 1;
	}

	.drag-handle {
		padding: 0.25rem;
	}

	.drag-handle :global(svg) {
		color: var(--dropdown-button-icon-default-color);
		height: 1rem;
		width: 1rem;
	}
</style>
