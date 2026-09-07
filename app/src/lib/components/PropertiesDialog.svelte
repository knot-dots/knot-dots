<script lang="ts">
	import { onDestroy, onMount, type Snippet } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Close from '~icons/knotdots/close';

	interface Props {
		actions?: Snippet;
		children: Snippet;
		dialog: HTMLDialogElement;
		title: string;
	}

	let { actions, children, dialog = $bindable(), title }: Props = $props();

	onMount(() => {
		if (!dialog) return;
		const handleBackdropClick = (e: MouseEvent) => {
			// Native <dialog> backdrop clicks fire on the dialog element itself
			if (e.target === dialog) {
				dialog.close();
			}
		};
		dialog.addEventListener('click', handleBackdropClick);
		onDestroy(() => dialog.removeEventListener('click', handleBackdropClick));
	});
</script>

<dialog bind:this={dialog}>
	<div>
		<p class="dialog-actions">
			<span>{title}</span>

			<button
				class="button-xs button-alternative system-primary"
				onclick={() => dialog.close()}
				type="button"
			>
				<Close />
				<span class="is-visually-hidden">{$_('close')}</span>
			</button>
		</p>

		<div class="details">
			{@render children()}

			<footer class="dialog-footer-actions">
				{@render actions?.()}
			</footer>
		</div>
	</div>
</dialog>

<style>
	dialog {
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

	footer {
		padding: 1.5rem;
	}

	.dialog-footer-actions {
		align-items: center;
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		justify-content: flex-start;
	}

	p {
		color: var(--color-gray-500);
		margin: 0 0 1.5rem;
	}
</style>
