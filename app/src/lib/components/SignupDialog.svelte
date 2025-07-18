<script lang="ts">
	import { passwordStrength } from 'check-password-strength';
	import { _ } from 'svelte-i18n';
	import Close from '~icons/knotdots/close';
	import { page } from '$app/state';
	import { signIn } from '@auth/sveltekit/client';

	interface Props {
		dialog: HTMLDialogElement;
	}

	let { dialog = $bindable() }: Props = $props();

	let password = $state('');

	let passwordConfirm = $state('');

	let givenName = $state('');

	let familyName = $state('');

	let error = $state('');

	let passwordInput: HTMLInputElement;

	let passwordConfirmInput: HTMLInputElement;

	async function checkPasswordsMatch(event: { currentTarget: HTMLInputElement }) {
		if (password != passwordConfirm) {
			passwordConfirmInput.setCustomValidity($_('signup_dialog.password_mismatch'));
			event.currentTarget.reportValidity();
		} else {
			passwordConfirmInput.setCustomValidity('');
		}
	}

	async function checkPasswordStrength(event: { currentTarget: HTMLInputElement }) {
		if (passwordStrength(password).id == 0) {
			passwordInput.setCustomValidity($_('signup_dialog.password_too_weak'));
			event.currentTarget.reportValidity();
		} else {
			passwordInput.setCustomValidity('');
		}
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();

		const response = await fetch(`/user/${page.url.searchParams.get('signup')}/signup`, {
			body: JSON.stringify({ familyName, givenName, password }),
			headers: { 'Content-Type': 'application/json' },
			method: 'POST'
		});

		if (response.ok) {
			dialog.close();
			const url = new URL(window.location.href);
			url.pathname = '/me';
			await signIn('keycloak', { callbackUrl: url.toString() });
		} else {
			error = $_('signup_dialog.unexpected_error');
		}
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			(
				(event.currentTarget as HTMLFormElement)?.querySelector(
					'.button-primary'
				) as HTMLButtonElement | null
			)?.click();
		}
	}
</script>

<dialog bind:this={dialog}>
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<form method="dialog" onkeydown={handleKeyDown} onsubmit={handleSubmit}>
		<p class="dialog-actions">
			<span>{$_('signup_dialog.heading')}</span>
			<button class="action-button" formnovalidate type="submit">
				<Close />
				<span class="is-visually-hidden">{$_('cancel')}</span>
			</button>
		</p>

		<input type="hidden" name="email" autocomplete="username" value={page.data.user?.email} />

		<div>
			<p>
				{#if error}{$_('signup_dialog.unexpected_error')}{:else}{$_('signup_dialog.message')}{/if}
			</p>

			<fieldset class="data-grid">
				<label class="label" for="givenName">
					{$_('signup_dialog.given_name')}
				</label>

				<input
					type="text"
					id="givenName"
					name="givenName"
					autocomplete="given-name"
					bind:value={givenName}
					required
				/>

				<label class="label" for="familyName">
					{$_('signup_dialog.family_name')}
				</label>

				<input
					type="text"
					id="familyName"
					name="familyName"
					autocomplete="family-name"
					bind:value={familyName}
					required
				/>

				<label class="label" for="password">
					{$_('signup_dialog.password')}
				</label>

				<input
					type="password"
					id="password"
					name="password"
					autocomplete="new-password"
					bind:this={passwordInput}
					bind:value={password}
					onchange={checkPasswordStrength}
					required
				/>

				<label class="label" for="passwordConfirm">
					{$_('signup_dialog.password_confirm')}
				</label>

				<input
					type="password"
					id="passwordConfirm"
					name="passwordConfirm"
					autocomplete="new-password"
					bind:this={passwordConfirmInput}
					bind:value={passwordConfirm}
					onchange={checkPasswordsMatch}
					required
				/>
			</fieldset>

			<button class="button-xs button-primary" type="submit">{$_('signup_dialog.submit')}</button>
		</div>
	</form>
</dialog>

<style>
	dialog {
		color: var(--color-gray-500);
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

	div {
		container-type: inline-size;
		overflow: auto;
		padding: 1.5rem;
	}

	@media (min-width: 768px) {
		div {
			padding: 1.5rem 5rem 5rem;
		}
	}

	fieldset {
		align-items: center;
		font-size: 0.875rem;
		margin: 1rem 0;
	}

	input {
		border: none;
		border-radius: 4px;
		color: var(--color-gray-700);
		padding: 0.375rem;
	}

	.dialog-actions span {
		color: var(--color-gray-500);
	}

	.data-grid {
		border: none;
		border-radius: 0;
		border-left: 2px solid var(--gray-200, #e5e7eb);
		padding: 0.5rem 0 0.5rem 1.5rem;
	}

	@container (min-inline-size: 20rem) {
		.data-grid {
			grid-template-columns: 1fr minmax(0, 3fr);
		}

		.data-grid > label {
			grid-column: 1 / 2;
		}

		.data-grid > input {
			grid-column: 2 / 3;
		}
	}
</style>
