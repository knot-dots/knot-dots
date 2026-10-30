<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Close from '~icons/knotdots/close';

	interface Props {
		dialog: HTMLDialogElement;
		onconfirm: () => void;
		// the area whose rights apply once the container inherits again
		source: string;
	}

	let { dialog = $bindable(), onconfirm, source }: Props = $props();
</script>

<dialog bind:this={dialog}>
	<form
		method="dialog"
		onsubmit={(event) => {
			event.preventDefault();
			dialog.close();
			onconfirm();
		}}
	>
		<button
			class="action-button action-button--size-s"
			onclick={() => dialog.close()}
			type="button"
		>
			<Close />
			<span class="is-visually-hidden">{$_('cancel')}</span>
		</button>

		<h2>{$_('permission_matrix.confirm_inherit_heading')}</h2>

		<p>{$_('permission_matrix.confirm_inherit_message', { values: { name: source } })}</p>

		<button class="button-primary confirm" type="submit">
			{$_('permission_matrix.confirm_inherit_button')}
		</button>
	</form>
</dialog>

<style>
	/* the dialog of the design: 48px inset, 24px radius, a red full-width button */
	form {
		max-width: 33rem;
		padding: 3rem;
	}

	h2 {
		color: var(--color-text-subtle);
		font-size: 1.25rem;
		font-weight: 600;
		line-height: 1.25;
		margin: 0 0 0.5rem;
	}

	p {
		color: var(--color-text-default);
		margin: 0 0 1.5rem;
	}

	.action-button {
		position: absolute;
		right: 0.5rem;
		top: 0.5rem;
	}

	.confirm {
		--button-background: var(--color-red-600);
		--button-hover-background: var(--color-red-700);
		--button-active-background: var(--color-red-700);

		display: block;
		line-height: 1;
		min-height: 2.25rem;
		width: 100%;
	}
</style>
