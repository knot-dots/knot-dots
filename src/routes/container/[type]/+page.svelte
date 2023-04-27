<script lang="ts">
	import type { ActionResult } from '@sveltejs/kit';
	import { getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { applyAction, deserialize } from '$app/forms';
	import { key } from '$lib/authentication';
	import type { KeycloakContext } from '$lib/authentication';
	import { sustainableDevelopmentGoals } from '$lib/models';

	const { getKeycloak } = getContext<KeycloakContext>(key);

	async function handleSubmit(event: SubmitEvent) {
		const data = new FormData(event.target as HTMLFormElement);

		// Ensure a fresh token will be included in the Authorization header.
		await getKeycloak()
			.updateToken(-1)
			.catch((reason) => reason);
		const response = await fetch((event.target as HTMLFormElement).action, {
			method: 'POST',
			body: data,
			headers: {
				...(sessionStorage.getItem('token')
					? { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
					: undefined)
			}
		});

		const result: ActionResult = deserialize(await response.text());
		await applyAction(result);
	}
</script>

<form method="POST" on:submit|preventDefault={handleSubmit}>
	<label>
		{$_('title')}
		<input name="title" type="text" required />
	</label>
	<label>
		{$_('description')}
		<textarea name="description" required />
	</label>
	<label>
		{$_('category')}
		<select name="category" required>
			<option label="" />
			{#each sustainableDevelopmentGoals.options as goal}
				<option label={$_(goal)}>{goal}</option>
			{/each}
		</select>
	</label>
	<p>
		<button class="primary">{$_('save')}</button>
	</p>
</form>

<style>
	form {
		background: white;
		border-radius: 8px;
		box-shadow: var(--shadow-md);
		display: flex;
		flex-direction: column;
		gap: 18px;
		padding: 16px;
	}

	form label:first-child {
		padding-bottom: 18px;
		border-bottom: solid 1px var(--color-gray-300);
	}
</style>
