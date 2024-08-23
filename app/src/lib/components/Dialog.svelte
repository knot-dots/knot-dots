<script lang="ts">
	import { _ } from 'svelte-i18n';
	import XMark from '~icons/heroicons/x-mark-20-solid';

	export let dialog: HTMLDialogElement;
</script>

<dialog bind:this={dialog} on:close>
	<button tabindex="-1" title={$_('close_modal')} type="button" on:click={() => dialog.close()}>
		<XMark />
	</button>
	<slot />
</dialog>

<style>
	dialog {
		border: none;
		margin: 0;
		overflow-y: auto;
		padding: 1.5rem;
		width: 100%;
	}

	button {
		--padding-x: 0;
		--padding-y: 0;
		align-items: center;
		border: none;
		color: var(--color-gray-400);
		display: inline-flex;
		height: 2rem;
		justify-content: center;
		outline: none;
		position: absolute;
		top: 0.75rem;
		right: 0.625rem;
		width: 2rem;
	}

	button:hover {
		background-color: var(--button-hover-background);
		color: var(--color-gray-900);
	}

	@media (min-width: 768px) {
		dialog {
			border-radius: 8px;
			margin: auto;
			max-width: 28rem;
		}

		dialog::backdrop {
			background: hsla(0, 0%, 50%, 0.3);
			backdrop-filter: blur(0.125rem);
		}
	}
</style>
