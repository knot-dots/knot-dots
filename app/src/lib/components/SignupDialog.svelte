<script lang="ts">
	import { passwordStrength } from 'check-password-strength';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import Dialog from '$lib/components/Dialog.svelte';
	import { signIn } from '@auth/sveltekit/client';
	import { overlayKey } from '$lib/models';

	export let dialog: HTMLDialogElement;

	let password = '';
	let passwordInput: HTMLInputElement;
	let passwordConfirm = '';
	let passwordConfirmInput: HTMLInputElement;
	let givenName = '';
	let familyName = '';
	let error = '';

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

	async function handleSubmit(event: { currentTarget: HTMLFormElement }): Promise<void> {
		const response = await fetch(`/user/${$page.url.searchParams.get('signup')}/signup`, {
			body: JSON.stringify({ familyName, givenName, password }),
			headers: { 'Content-Type': 'application/json' },
			method: 'POST'
		});

		if (response.ok) {
			dialog.close();
			const url = new URL(window.location.href);
			url.search = '';
			url.hash = overlayKey.enum.profile;
			await signIn('keycloak', { callbackUrl: url.toString() });
		} else {
			error = $_('signup_dialog.unexpected_error');
		}
	}
</script>

<Dialog bind:dialog>
	<form class="details" on:submit|preventDefault={handleSubmit}>
		<h2>
			{$_('signup_dialog.heading')}
		</h2>
		<p>
			{#if error}{$_('signup_dialog.unexpected_error')}{:else}{$_('signup_dialog.message')}{/if}
		</p>
		<input type="hidden" name="email" autocomplete="username" value={$page.data.user?.email} />
		<label>
			{$_('signup_dialog.given_name')}
			<input
				type="text"
				name="givenName"
				autocomplete="given-name"
				bind:value={givenName}
				required
			/>
		</label>
		<label>
			{$_('signup_dialog.family_name')}
			<input
				type="text"
				name="familyName"
				autocomplete="family-name"
				bind:value={familyName}
				required
			/>
		</label>
		<label>
			{$_('signup_dialog.password')}
			<input
				type="password"
				name="password"
				autocomplete="new-password"
				bind:this={passwordInput}
				bind:value={password}
				on:change={checkPasswordStrength}
				required
			/>
		</label>
		<label>
			{$_('signup_dialog.password_confirm')}
			<input
				type="password"
				name="passwordConfirm"
				autocomplete="new-password"
				bind:this={passwordConfirmInput}
				bind:value={passwordConfirm}
				on:change={checkPasswordsMatch}
				required
			/>
		</label>
		<button class="primary" type="submit">{$_('signup_dialog.submit')}</button>
	</form>
</Dialog>

<style>
	button {
		display: block;
		width: 100%;
	}
</style>
