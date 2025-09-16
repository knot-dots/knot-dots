<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Close from '~icons/knotdots/close';
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
		dialog: HTMLDialogElement;
		title: string;
	}

	let { children, dialog = $bindable(), title }: Props = $props();
</script>

<dialog bind:this={dialog}>
	<div>
		<p class="dialog-actions">
			<span>{title}</span>

			<button class="button-xs button-alternative" onclick={() => dialog.close()} type="button">
				<Close />
				<span class="is-visually-hidden">{$_('close')}</span>
			</button>
		</p>

		<div class="details">
			{@render children()}
		</div>
	</div>
</dialog>

<style>
	dialog {
		--content-width: 100%;

		width: calc(min(54rem, 100vw));
	}

	dialog > * {
		min-width: 30rem;
	}

	.dialog-actions {
		align-items: center;
		background-color: white;
		display: flex;
		gap: 0.5rem;
		justify-content: space-between;
		padding: 1.5rem;
		position: sticky;
		top: 0;
		z-index: 1;
	}

	.dialog-actions span {
		color: var(--color-gray-500);
	}
</style>
