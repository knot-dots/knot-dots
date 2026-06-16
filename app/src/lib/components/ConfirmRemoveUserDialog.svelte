<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Close from '~icons/knotdots/close';
	import { displayName, type User } from '$lib/models';

	interface Props {
		dialog: HTMLDialogElement;
		handleSubmit: (user: User | null) => void;
		user: User | null;
	}

	let { dialog = $bindable(), handleSubmit, user = $bindable() }: Props = $props();

	const name = $derived(user ? displayName(user) : '');
</script>

<dialog bind:this={dialog}>
	<form method="dialog" onsubmit={() => handleSubmit(user)}>
		<button
			class="action-button action-button--size-s"
			onclick={() => {
				user = null;
				dialog.close();
			}}
			type="button"
		>
			<Close />
			<span class="is-visually-hidden">{$_('cancel')}</span>
		</button>

		<h2>
			{$_('confirm_remove_user_dialog.heading', {
				values: { name }
			})}
		</h2>

		<p>
			{$_('confirm_remove_user_dialog.message')}
		</p>

		<button class="button-primary button-xs" type="submit">
			{$_('confirm_remove_user_dialog.button', { values: { name } })}
		</button>
	</form>
</dialog>

<style>
	form {
		max-width: 33rem;
		padding: 3rem;
	}

	h2 {
		color: var(--color-gray-600);
		font-size: 1.25rem;
		font-weight: 600;
		line-height: 1.25;
		margin: 0 0 0.5rem;
	}

	p {
		color: var(--color-gray-500);
		font-size: 1rem;
		font-weight: 400;
		margin: 0 0 1.5rem;
	}

	.action-button {
		position: absolute;
		right: 0.5rem;
		top: 0.5rem;
	}

	.button-primary {
		display: block;
		width: 100%;
	}
</style>
