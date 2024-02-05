<script lang="ts">
	import { Icon, XMark } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';

	export let dialog: HTMLDialogElement;
</script>

<dialog bind:this={dialog} on:close>
	<button tabindex="-1" title={$_('close_modal')} type="button" on:click={() => dialog.close()}>
		<Icon src={XMark} size="20" />
	</button>
	<slot />
</dialog>

<style>
	dialog {
		border: none;
		padding: 1.5rem;
		position: relative;
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
			max-width: 28rem;
		}
	}
</style>
